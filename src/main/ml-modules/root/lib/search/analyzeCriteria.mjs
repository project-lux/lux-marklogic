'use strict';

// Pass 1 of the two-pass criteria pipeline.
// Traverses raw search criteria JSON, validates, normalizes, and produces
// an immutable criteria tree plus an analysis summary. No Optic plans are built.
//
// Scope boundary: this function analyzes criteria within the current scope
// only. Hop patterns (hopWithField, hopInverse) carry nested criteria that
// targets a different scope — that nested criteria is stored as-is on the
// SearchTerm and analyzed in a separate analyzeCriteria call during Pass 2
// (via processNestedCriteria / processNestedCriteriaAsCts). Consequently,
// top-level analysis flags like hasScoreContributingCriteria reflect only
// the outer scope. This is sufficient for current engine optimizations
// (Opt 1/18/20). If cross-scope visibility is needed in the future, a
// deeper pre-scan could be added here.

//#region Imports
import {
  getSearchTermNames,
  getSearchTermConfig,
} from '../../config/searchTermsConfig.mjs';
import { getSearchScopeTypes, isSearchScopeName } from '../searchScope.mjs';
import * as utils from '../../utils/utils.mjs';
import {
  DEFAULT_SEARCH_OPTIONS_EXACT,
  DEFAULT_SEARCH_OPTIONS_KEYWORD,
  SEARCH_OPTIONS_INVERSE_MAP,
  SEARCH_OPTIONS_NAME_EXACT,
  SEARCH_OPTIONS_NAME_KEYWORD,
} from '../appConstants.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
  NotImplementedError,
} from '../errorClasses.mjs';
import { SearchTerm } from './SearchTerm.mjs';
import { SearchTermConfig } from './SearchTermConfig.mjs';
import {
  CHILD_TYPE_ATOMIC,
  CHILD_TYPE_GROUP,
  CHILD_TYPE_TERM,
  PATTERN_NAME_INDEXED_VALUE,
  SearchPatternBase,
} from './patterns/loadPatterns.mjs';
import { STOP_WORDS } from '../../data/stopWords.mjs';
import {
  createAnalysisResult,
  createGroupNode,
  createLeafNode,
} from './criteriaNodes.mjs';
//#endregion

//#region Constants
const PUNCTUATION_ONLY_REGEX = /^[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]*$/;
const WILDCARD_CHARS = '*?';
const WILDCARD_CHAR_REGEX = new RegExp(`[${WILDCARD_CHARS}]`);
const QUALIFYING_CHARS = '\\s\\-';
const QUALIFYING_CHARS_REGEX = new RegExp(`[${QUALIFYING_CHARS}]`);
const MINIMUM_QUALIFYING_CHAR_COUNT = 3;
const QUALIFYING_WILDCARD_REGEX = new RegExp(
  `([${WILDCARD_CHARS}][^${WILDCARD_CHARS}${QUALIFYING_CHARS}]{${MINIMUM_QUALIFYING_CHAR_COUNT},})|([^${WILDCARD_CHARS}${QUALIFYING_CHARS}]{${MINIMUM_QUALIFYING_CHAR_COUNT},}[${WILDCARD_CHARS}])`,
);
const WILDCARDS_TO_CONSOLIDATE_REGEX = new RegExp('([?*]+[*])|([*][?*]+)');
//#endregion

//#region Public API

// Analyzes raw search criteria and produces a criteria tree with an analysis summary.
// This is Pass 1 of the two-pass pipeline: all validation, normalization,
// tokenization, and stop-word detection happen here. No Optic API calls.
//
// Scope boundary: hop pattern criteria (e.g., the inner object in
// { memberOf: { name: "blue" } }) is NOT recursively analyzed here. It is
// stored on the leaf's SearchTerm and gets its own analyzeCriteria call
// during Pass 2. Top-level flags (hasScoreContributingCriteria, etc.) are
// therefore blind to what is inside nested hops.
//
// Returns: createAnalysisResult({ criteriaTree, scope, isMultiScope,
//          hasScoreContributingCriteria, usableLeafCount })
function analyzeCriteria({
  scp,
  planCriteria,
  planScope = 'item',
  parentId = null,
  parentScope = null,
  allowMultiScope = false,
}) {
  const isTopLevel = !parentId;
  const uriCol = isTopLevel ? 'uri' : parentId + '_uri';
  const fragCol = isTopLevel ? 'frag' : parentId + '_frag';
  const iriCol = isTopLevel ? 'iri' : parentId + '_iri';
  const dataTypeCol = isTopLevel ? 'dataType' : parentId + '_dataType';
  const columns = { uriCol, fragCol, iriCol, dataTypeCol };

  if (!utils.isDefined(planCriteria)) {
    throw new InvalidSearchRequestError('search criteria must be defined.');
  }

  let scope = isTopLevel ? (planCriteria._scope ?? planScope) : planScope;
  // Captured before the loop below reassigns `scope` per OR-branch when
  // isMultiScope. Represents the scope this invocation of analyzeCriteria
  // started with — not necessarily the scope of the entire criteria tree,
  // since this function recurses for nested groups and hop criteria.
  const initialScope = scope;

  const isMultiScope = scope === 'multi';
  if (isMultiScope) {
    validateMultiScopeCriteria(planCriteria, isTopLevel, allowMultiScope);
  }

  // Union of each branch's own scope types, used downstream (buildScopedCtsQuery,
  // assemblePlan) in place of getSearchScopeTypes('multi'), which is always empty.
  const multiScopeNames = new Set();

  let searchTermNames = isMultiScope ? null : getSearchTermNames(scope);

  let { criteria, logicType } = parseCriteriaAndLogicType(planCriteria);

  let usableLeafCount = 0;
  let hasScoreContributingCriteria = false;

  const children = [];

  // Dynamic loop — tokenization and conjunction inlining push new entries.
  for (let idx = 0; idx < criteria.length; idx++) {
    const criterion = criteria[idx];

    if (isMultiScope) {
      scope = criterion._scope;
      searchTermNames = getSearchTermNames(scope);
      multiScopeNames.add(scope);
    }

    const id = sem.uuidString().replace(/-/g, '_');

    // Nested conjunction → analyze recursively, flatten if inlineable.
    if (criterion.AND || criterion.OR || criterion.NOT) {
      const result = analyzeConjunction({
        criterion,
        logicType,
        scope,
        id,
        scp,
        parentIsScopeConstrained: !isMultiScope,
      });
      if (result.skip) {
        continue;
      }
      if (result.inlineCriteria) {
        criteria.push(...result.inlineCriteria);
        continue;
      }
      hasScoreContributingCriteria ||=
        result.groupNode.hasScoreContributingCriteria;
      children.push(result.groupNode);
      continue;
    }

    // Leaf term.
    const name = Object.keys(criterion).find(
      (k) => k[0] !== '_' && searchTermNames.includes(k),
    );
    if (!name) {
      throw new InvalidSearchRequestError(
        `search term does not specify a term name in criteria ${JSON.stringify(criterion)}.`,
      );
    }

    const searchTerm = buildLeafSearchTerm(scp, {
      criterion,
      id,
      name,
      scope,
      isTopLevel,
      iriCol,
      uriCol,
      fragCol,
      dataTypeCol,
    });

    if (!searchTerm.isUsable()) {
      continue;
    }

    const patternInstance = SearchPatternBase.get(
      searchTerm.getSearchTermConfig().getPatternName(),
    );

    // Tokenize multi-word values into AND group.
    const tokenizedCriterion = tokenizeTermValue(patternInstance, searchTerm);
    if (tokenizedCriterion) {
      criteria.push(tokenizedCriterion);
      continue;
    }

    scp.incrementCriteriaCount();
    usableLeafCount++;
    hasScoreContributingCriteria ||=
      patternInstance.contributesRelevanceScore();

    children.push(
      createLeafNode({
        id,
        name,
        scope,
        searchTerm,
        patternInstance,
        contributesScore: patternInstance.contributesRelevanceScore(),
      }),
    );
  }

  // Guard against searches composed entirely of stop words / punctuation.
  if (isTopLevel && scp.getCriteriaCount() < 1) {
    const ignored = scp.getIgnoredTerms();
    if (ignored.length > 0) {
      throw new InvalidSearchRequestError(
        `the search criteria given only contains '${ignored.join("', '")}', which is an ignored term(s). Please consider creating phrases using double quotes and/or adding additional criteria.`,
      );
    }
    throw new InvalidSearchRequestError('more search criteria is required.');
  }

  // Single-branch OR is semantically equivalent to AND; avoid joinFullOuter.
  const usableBranchCount =
    children.filter((c) => c.type === 'group').length + usableLeafCount;
  if (logicType === 'or' && usableBranchCount === 1) {
    logicType = 'and';
  }

  // After a single-branch OR→AND collapse, a surviving group child whose
  // conjunctionType matches the new parent type should be inlined (its
  // children flattened into the parent). This guarantees same-type nesting
  // never reaches Pass 2, keeping the 3×3 matrix free of degenerate cases.
  const finalChildren = [];
  for (const child of children) {
    if (
      child.type === 'group' &&
      child.conjunctionType === logicType &&
      logicType !== 'not'
    ) {
      finalChildren.push(...child.children);
      hasScoreContributingCriteria ||= child.hasScoreContributingCriteria;
    } else {
      finalChildren.push(child);
    }
  }

  const criteriaTree = createGroupNode({
    id: parentId,
    conjunctionType: logicType,
    scope: initialScope,
    children: finalChildren,
    columns,
    isTopLevel,
    hasScoreContributingCriteria,
  });

  const scopeTypes = isMultiScope
    ? Array.from(
        new Set(
          Array.from(multiScopeNames).flatMap((name) =>
            getSearchScopeTypes(name, false),
          ),
        ),
      )
    : null;

  return createAnalysisResult({
    criteriaTree,
    scope: initialScope,
    isMultiScope,
    scopeTypes,
    hasScoreContributingCriteria,
    usableLeafCount,
  });
}
//#endregion

//#region Conjunction analysis

// Analyzes a nested conjunction (AND/OR/NOT) within the parent's context.
// Returns one of:
//   { skip: true }            — sub-group had no usable criteria
//   { inlineCriteria: [...] } — same-type nesting, flatten into parent
//   { groupNode }             — analyzed sub-group node (carries
//                               hasScoreContributingCriteria on itself)
function analyzeConjunction({
  criterion,
  logicType,
  scope,
  id,
  scp,
  parentIsScopeConstrained,
}) {
  // AND-in-AND and OR-in-OR: inline the children into the parent.
  if (criterion.AND && logicType === 'and') {
    return { inlineCriteria: criterion.AND };
  }
  if (criterion.OR && logicType === 'or') {
    return { inlineCriteria: criterion.OR };
  }

  // NOT-in-AND and NOT-in-NOT are rewritten to { OR: criterion.NOT }
  // before recursive analysis (see buildConjunction in engine.mjs).
  // The tree preserves the original conjunction type — the rewrite is a
  // construction concern (Pass 2 decides join type from the 3×3 matrix).

  const subCriteria = criterion.AND ?? criterion.OR ?? criterion.NOT ?? null;
  const subConjunctionType = criterion.AND
    ? 'and'
    : criterion.OR
      ? 'or'
      : 'not';

  if (!subCriteria) {
    throw new InternalServerError(
      'analyzeConjunction called with non-conjunction criterion.',
    );
  }

  const countBefore = scp.getCriteriaCount();
  const subAnalysis = analyzeCriteria({
    scp,
    planCriteria: criterion,
    planScope: scope,
    parentId: id,
    parentScope: parentIsScopeConstrained ? scope : null,
  });

  if (scp.getCriteriaCount() === countBefore) {
    return { skip: true };
  }

  return { groupNode: subAnalysis.criteriaTree };
}
//#endregion

//#region Leaf term construction

// Constructs a SearchTerm for a single leaf criterion. Resolves config,
// validates pattern requirements, casts values, sanitizes wildcards,
// detects stop words. Moved from engine.mjs — identical logic.
function buildLeafSearchTerm(
  scp,
  {
    criterion,
    id,
    name,
    scope,
    isTopLevel,
    iriCol,
    uriCol,
    fragCol,
    dataTypeCol,
  },
) {
  let termConfig = new SearchTermConfig(getSearchTermConfig(scope, name));

  const searchTerm = new SearchTerm()
    .addId(id)
    .addName(name)
    .addScopeName(scope)
    .addSearchTermConfig(termConfig)
    .addTopLevel(isTopLevel)
    .addChildInfo(getChildInfo(scope, criterion[name]))
    .addParentColumns({ iriCol, uriCol, fragCol, dataTypeCol })
    .addCriteria(criterion[name]);

  // Runtime search term properties are represented with leading underscores on criteria.
  Object.keys(criterion)
    .filter((k) => k.startsWith('_'))
    .forEach((k) => {
      searchTerm.addProperty(k.substring(1), criterion[k]);
    });

  applyPatternRequirements(searchTerm, termConfig);

  // Validate that the pattern accepts the value's structural type.
  const rawValue = searchTerm.getCriteria();
  if (utils.isObject(rawValue)) {
    const childId = getChildId(rawValue);
    if (
      childId &&
      termConfig.hasIdIndexReferences() &&
      !termConfig.isTransitive()
    ) {
      termConfig = new SearchTermConfig({
        indexReferences: termConfig.getIdIndexReferences(),
        patternName: PATTERN_NAME_INDEXED_VALUE,
        scalarType: 'string',
        forceExactMatch: true,
      });
      searchTerm
        .addName(name + 'Id')
        .addSearchTermConfig(termConfig)
        .setCriteria(childId);
    } else if (rawValue.AND || rawValue.OR || rawValue.NOT) {
      if (!termConfig.acceptsGroupAsChild()) {
        throw new InvalidSearchRequestError(
          `the '${name}' term contains a group but is not allowed to.`,
        );
      }
    } else if (Object.keys(rawValue).some((k) => !k.startsWith('_'))) {
      if (!termConfig.acceptsTermAsChild()) {
        throw new InvalidSearchRequestError(
          `the '${name}' term contains another term but is not allowed to.`,
        );
      }
    }
  } else if (!termConfig.acceptsAtomicValue()) {
    throw new InvalidSearchRequestError(
      `the search term '${name}' in scope '${scope}' does not accept atomic values.`,
    );
  }

  // Cast value to the correct type if scalar and not dateTime.
  let value;
  const scalarType = termConfig.getScalarType();
  const rawTermValue = searchTerm.getCriteria();
  if (scalarType && scalarType !== 'dateTime') {
    const caster = xs[scalarType];
    if (typeof caster !== 'function') {
      throw new InternalServerError(
        `Search term '${searchTerm.getName()}' has invalid scalarType '${scalarType}': xs.${scalarType} is not a function.`,
      );
    }
    value = caster(rawTermValue);
  } else {
    value = typeof rawTermValue === 'string' ? rawTermValue : null;
  }
  searchTerm.setValue(value);

  // forceExactMatch overrides the configured options reference.
  const searchOptions = resolveSearchOptions(
    termConfig.isForceExactMatch()
      ? SEARCH_OPTIONS_NAME_EXACT
      : termConfig.getOptionsReference(),
    termConfig.getPatternName(),
    [],
    searchTerm.getSearchOptions(),
  );
  searchTerm.setSearchOptions(searchOptions);

  // Validate and sanitize wildcard characters for keyword-type terms.
  const rawCriteria = searchTerm.getCriteria();
  if (
    typeof rawCriteria === 'string' &&
    SearchPatternBase.get(
      termConfig.getPatternName(),
    ).getAllowedSearchOptionsName() === SEARCH_OPTIONS_NAME_KEYWORD &&
    WILDCARD_CHAR_REGEX.test(rawCriteria)
  ) {
    searchTerm.setValue(sanitizeAndValidateWildcardedStrings(rawCriteria));
  }

  // Skip stop words and punctuation-only terms.
  const unusableWords = getUnusableTermWords(searchTerm.getCriteria());
  if (unusableWords.length > 0) {
    searchTerm.setUsable(false);
    unusableWords.forEach((w) => scp.addIgnoredTerm(w));
  }

  return searchTerm;
}
//#endregion

//#region Criteria parsing

// Parses a planCriteria object into a mutable array of criteria and a logic type.
function parseCriteriaAndLogicType(planCriteria) {
  let criteria;
  let logicType;
  if (planCriteria.AND) {
    criteria = xdmp.toJSON(planCriteria.AND).toObject();
    logicType = 'and';
  } else if (planCriteria.OR) {
    criteria = xdmp.toJSON(planCriteria.OR).toObject();
    logicType = 'or';
  } else if (planCriteria.NOT) {
    criteria = xdmp.toJSON(planCriteria.NOT).toObject();
    logicType = 'not';
  } else {
    criteria = [xdmp.toJSON(planCriteria).toObject()];
    logicType = 'and';
  }
  return { criteria, logicType };
}
//#endregion

//#region Search options resolution

function resolveSearchOptions(
  optionsName = null,
  patternName = null,
  requestOverridesArr = [],
  instanceOverridesArr = {},
) {
  optionsName = resolveSearchOptionsName(optionsName, patternName);
  if (SEARCH_OPTIONS_NAME_EXACT == optionsName) {
    return DEFAULT_SEARCH_OPTIONS_EXACT;
  } else if (optionsName == SEARCH_OPTIONS_NAME_KEYWORD) {
    return mergeSearchOptions(
      mergeSearchOptions(DEFAULT_SEARCH_OPTIONS_KEYWORD, requestOverridesArr),
      instanceOverridesArr,
    );
  }
  if (optionsName) {
    console.warn(
      `The '${optionsName}' search options reference is unknown. Please check the search criteria configuration. Using null.`,
    );
  }
  return null;
}

function resolveSearchOptionsName(optionsName = null, patternName = null) {
  if (optionsName) {
    return optionsName;
  }
  const pattern = SearchPatternBase.get(patternName);
  return pattern ? pattern.getDefaultSearchOptionsName() : null;
}

function mergeSearchOptions(defaultOptionsArr, overrideOptionsArr) {
  if (utils.isNonEmptyArray(overrideOptionsArr)) {
    if (overrideOptionsArr.includes('exact')) {
      return DEFAULT_SEARCH_OPTIONS_EXACT;
    }
    let mergedOptionsArr = defaultOptionsArr;
    overrideOptionsArr.forEach((searchOption) => {
      if (SEARCH_OPTIONS_INVERSE_MAP.hasOwnProperty(searchOption)) {
        mergedOptionsArr = utils.replaceValueInArray(
          mergedOptionsArr,
          SEARCH_OPTIONS_INVERSE_MAP[searchOption],
          searchOption,
        );
      } else {
        console.log(
          `Ignoring an unrecognized search term option of '${searchOption}'.`,
        );
      }
    });
    return mergedOptionsArr;
  }
  return defaultOptionsArr;
}
//#endregion

//#region Tokenization

function tokenizeTermValue(patternInstance, searchTerm) {
  const termValue = searchTerm.getCriteria();
  if (
    typeof termValue !== 'string' ||
    searchTerm.isCompleteMatch() ||
    searchTerm.isTokenized() ||
    !patternInstance.mayTokenizeValue()
  ) {
    return null;
  }
  const trimmed = termValue.trim();
  if (!trimmed.includes(' ') || trimmed.match(/^('|").+\1$/)) {
    return null;
  }
  const tokens = utils.splitHonoringPhrases(trimmed);
  if (tokens.length <= 1) {
    return null;
  }
  const name = searchTerm.getName();
  const props = searchTerm.getProperties();
  const sharedProps = {
    _tokenized: true,
    ...Object.keys(props).reduce((acc, k) => {
      acc[`_${k}`] = props[k];
      return acc;
    }, {}),
  };
  const tokenCriteria = tokens.map((token) => {
    return { [name]: token, ...sharedProps };
  });
  return { AND: tokenCriteria, _scope: searchTerm.getScopeName() };
}
//#endregion

//#region Validation helpers

function applyPatternRequirements(searchTerm, termConfig) {
  const patternName = termConfig.getPatternName();
  const pattern = SearchPatternBase.get(patternName);

  if (!pattern) {
    throw new NotImplementedError(
      `Unimplemented pattern name: ${patternName}.`,
    );
  }

  const requiredProps = pattern.getRequiredRuntimeSearchTermProperties();
  const missingProps = requiredProps.filter((propName) => {
    const propValue = searchTerm.getProperty(propName);
    return !utils.isNonEmptyString(propValue, true);
  });

  if (missingProps.length) {
    const formattedMissing = missingProps
      .map((propName) => `_${propName}`)
      .join(', ');
    throw new InvalidSearchRequestError(
      `Search term '${searchTerm.getName()}' with pattern '${patternName}' is missing required runtime property(ies): ${formattedMissing}`,
    );
  }
}

function validateMultiScopeCriteria(planCriteria, topLevel, allowMultiScope) {
  if (!topLevel || !allowMultiScope) {
    throw new InvalidSearchRequestError(
      "search scope of 'multi' not supported by this operation or level.",
    );
  }

  if (!planCriteria?.OR || !utils.isArray(planCriteria.OR)) {
    throw new InvalidSearchRequestError(
      "a search with scope 'multi' must contain an 'OR' array.",
    );
  }

  planCriteria.OR.forEach((branch, idx) => {
    const branchScope = branch?._scope;
    if (
      !branchScope ||
      !isSearchScopeName(branchScope) ||
      branchScope === 'multi'
    ) {
      throw new InvalidSearchRequestError(
        `Invalid criteria: OR branch ${idx} in '_scope: multi' must declare a valid non-multi _scope.`,
      );
    }
  });
}
//#endregion

//#region Stop word / punctuation detection

function isUnusableWord(word) {
  const cleaned = word.replace(/^"|"$/g, '');
  return (
    PUNCTUATION_ONLY_REGEX.test(cleaned) ||
    STOP_WORDS.has(cleaned.toLowerCase())
  );
}

function getUnusableTermWords(value) {
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (trimmed.length === 0) return [value];
  if (PUNCTUATION_ONLY_REGEX.test(trimmed)) return [trimmed];
  const words = utils.splitHonoringPhrases(trimmed);
  const unusable = words.filter(isUnusableWord);
  return unusable.length === words.length ? unusable : [];
}
//#endregion

//#region Wildcard validation

function hasInvalidWildcardCriteria(str) {
  const pieces = str.split(QUALIFYING_CHARS_REGEX);
  for (let i = 0; i < pieces.length; i++) {
    if (
      WILDCARD_CHAR_REGEX.test(pieces[i]) &&
      !QUALIFYING_WILDCARD_REGEX.test(pieces[i])
    ) {
      return true;
    }
  }
  return false;
}

function consolidateApplicableWildcards(str) {
  let matches;
  while ((matches = str.match(WILDCARDS_TO_CONSOLIDATE_REGEX))) {
    str = str.replace(matches[0], '*');
  }
  return str;
}

function sanitizeAndValidateWildcardedStrings(strOrArr) {
  if (strOrArr) {
    const returnOneValue = !utils.isArray(strOrArr);
    if (returnOneValue) {
      strOrArr = [strOrArr];
    }
    for (let i = 0; i < strOrArr.length; i++) {
      const origValue = strOrArr[i] + '';
      strOrArr[i] = consolidateApplicableWildcards(origValue.trim());
      if (hasInvalidWildcardCriteria(strOrArr[i])) {
        let msg = `wildcarded strings must have at least three non-wildcard characters before or after the wildcard; '${origValue}' does not qualify`;
        if (origValue != strOrArr[i]) {
          msg += `, even after adjusting to '${strOrArr[i]}'`;
        }
        throw new InvalidSearchRequestError(msg);
      }
    }
    if (returnOneValue) {
      strOrArr = strOrArr[0];
    }
  }
  return strOrArr;
}
//#endregion

//#region Child term helpers

function getChildId(termValue) {
  const value = termValue?.id ?? termValue?.iri ?? null;
  return typeof value === 'string' ? value : null;
}

function getChildInfo(scopeName, parentTermValue) {
  let valueType = CHILD_TYPE_GROUP;
  let patternName = null;

  const childIsGroup = hasGroup(parentTermValue);
  if (!childIsGroup) {
    const childTermName = getFirstNonOptionPropertyName(parentTermValue);
    const childTermValue = parentTermValue[childTermName];
    const searchTermConfig = new SearchTermConfig(
      getSearchTermConfig(scopeName, childTermName),
    );
    patternName = searchTermConfig.getPatternName();
    valueType =
      utils.isArray(childTermValue) || utils.isObject(childTermValue)
        ? CHILD_TYPE_TERM
        : CHILD_TYPE_ATOMIC;
  }

  return { patternName, valueType };
}

function hasGroup(termValue) {
  return termValue && (termValue.AND || termValue.OR || termValue.NOT);
}

function getFirstNonOptionPropertyName(termValue) {
  let propName = null;
  if (utils.isObject(termValue)) {
    for (const p of Object.keys(termValue)) {
      if (!p.startsWith('_')) {
        propName = p;
        break;
      }
    }
  }
  return propName;
}

function hasNonOptionPropertyName(termValue) {
  return getFirstNonOptionPropertyName(termValue) != null;
}
//#endregion

export {
  analyzeCriteria,
  getChildId,
  getFirstNonOptionPropertyName,
  hasNonOptionPropertyName,
  resolveSearchOptions,
  sanitizeAndValidateWildcardedStrings,
};
