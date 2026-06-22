'use strict';

//#region Imports
import op from '/MarkLogic/optic.mjs';
import { getSearchScopeTypes, isSearchScopeName } from '../searchScope.mjs';
import * as utils from '../../utils/utils.mjs';
import { FACETS_CONFIG } from '../../config/facetsConfig.mjs';
import { SEMANTIC_FACETS_CONFIG } from '../../config/semanticFacetsConfig.mjs';
import { isSemanticFacet } from '../facetsLib.mjs';
import {
  getSearchTermNames,
  getSearchTermConfig,
} from '../../config/searchTermsConfig.mjs';
import { convertSecondsToDateStr } from '../../utils/dateUtils.mjs';
import {
  DEFAULT_SEARCH_OPTIONS_EXACT,
  DEFAULT_SEARCH_OPTIONS_KEYWORD,
  SEARCH_OPTIONS_INVERSE_MAP,
  SEARCH_OPTIONS_NAME_EXACT,
  SEARCH_OPTIONS_NAME_KEYWORD,
  SEARCH_PAGE_SLICE_ENABLED,
  SEMANTIC_SORT_TIMEOUT,
} from '../appConstants.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
  NotImplementedError,
} from '../errorClasses.mjs';
import { FacetResponses } from './FacetResponses.mjs';
import { SearchExecutionResult } from './SearchExecutionResult.mjs';
import { SearchTerm } from './SearchTerm.mjs';
import { SearchTermConfig } from './SearchTermConfig.mjs';
import { PatternOptions } from './PatternOptions.mjs';
import { tryExecuteKeywordPageSlice } from './keywordPageSlice.mjs';
import {
  CHILD_TYPE_ATOMIC,
  CHILD_TYPE_GROUP,
  CHILD_TYPE_TERM,
  PATTERN_NAME_INDEXED_VALUE,
  SearchPatternBase,
} from './patterns/loadPatterns.mjs';
import { expandPredicate } from './prefixUtils.mjs';
import { STOP_WORDS } from '../../data/stopWords.mjs';
//#endregion

//#region Constants
const MAXIMUM_PAGE_WITH_LENGTH = 100000;

// Accumulator buckets that carry "content" (real plan contributions).
// Keep in sync with createPlanAccumulator. Used by accContainsOnly to answer
// shape questions about the accumulator without each caller re-listing every
// bucket name (which becomes WET and outdated when a new bucket is added).
const ACC_CONTENT_BUCKETS = [
  'constraints',
  'ctsConstraints',
  'conjunctionJoins',
  'andOrSubPlans',
  'patternJoins',
];
//#endregion

//#region Exported functions
// Returns an instance of SearchExecutionResult
function performSearch(scp) {
  const searchCriteria = scp.getSearchCriteria();
  const searchScope = scp.getSearchScope();
  const allowMultiScope = scp.isAllowMultiScope();
  const page = scp.getPage();
  const pageLength = scp.getPageLength();
  const includeSearchResults = scp.getIncludeSearchResults();
  const facetRequests = scp.getFacetRequests();
  let patternOptions = scp.getPatternOptions();

  let planAsSource;
  try {
    let searchResults = [];
    let total = -1;
    let resultPage = -1;
    let planAsJson = null;
    let facetResponses = null;

    // Require the caller want search results or at least one facet before
    // doing any work.
    if (includeSearchResults || facetRequests?.length > 0) {
      // Facet-only requests use the unsorted plan and never need relevance
      // scores. Clearing sort criteria prevents assemblePlan from injecting
      // op.fromSearch (via the areScoresRequired check) and prevents
      // buildSortedResultsPlan from doing any sort-branch work.
      if (!includeSearchResults) {
        scp.setSortCriteria(null);
      }

      // Simple-keyword queries can bypass the Optic pipeline entirely
      // (cts.search → top-K → hydrate dataType). Returns null when the
      // request is not eligible; see lib/search/keywordPageSlice.mjs.
      const pageSlice = SEARCH_PAGE_SLICE_ENABLED
        ? tryExecuteKeywordPageSlice(scp, analyzeLeafCriteria)
        : null;
      if (pageSlice) {
        const paginationResult = paginateResults({
          rows: pageSlice.rows,
          pageWith: null, // page-slice path is ineligible when pageWith is set
          page,
          pageLength: pageLength ?? 20,
        });
        return new SearchExecutionResult({
          searchResults: paginationResult.searchResults,
          total: pageSlice.total,
          resultPage: paginationResult.resultPage,
          planAsJson: null,
          planAsSource: '(page-slice: cts.search outside Optic)',
          facetResponses: null,
        });
      }

      const { sortedResultsPlan, unsortedResultsPlan } = buildPlans({
        scp,
        planCriteria: searchCriteria,
        planScope: searchScope,
        allowMultiScope,
        groups: getResultRowGrouping(),
        sortCriteria: scp.getSortCriteria(),
        patternOptions,
      });

      let useThisPlan = includeSearchResults
        ? sortedResultsPlan
        : unsortedResultsPlan;

      // pageWith's limit is imposed here; see paginateResults for the rest.
      const pageWith = scp.getPageWith();
      useThisPlan =
        includeSearchResults && pageWith
          ? useThisPlan.limit(MAXIMUM_PAGE_WITH_LENGTH + 1)
          : useThisPlan;

      planAsJson = useThisPlan.export();
      planAsSource = getPlanSource(planAsJson);

      const rows = useThisPlan.result().toArray();

      if (includeSearchResults) {
        total = rows.length;
        const paginationResult = paginateResults({
          rows,
          pageWith,
          page,
          pageLength: pageLength ?? 20,
        });
        resultPage = paginationResult.resultPage;
        searchResults = paginationResult.searchResults;
      }

      // calculateFacets returns null when facets are not requested.
      facetResponses = calculateFacets(rows, facetRequests);
    }

    return new SearchExecutionResult({
      searchResults,
      total,
      resultPage,
      planAsJson,
      planAsSource,
      facetResponses,
    });
  } catch (ex) {
    console.warn({
      'Error during search execution': ex.message,
      stack: ex.stack,
      plan: planAsSource,
    });
    throw ex;
  }
}

// For recursive calls from pattern classes — returns a single assembled plan.
// parentScope: when set, the caller's plan already constrains results to that
// search scope's types. Sub-plans built for the same scope can skip the
// redundant dataType constraint ("empty-groups" optimization).
function processCriteria({
  scp,
  planCriteria,
  planScope = 'item',
  patternOptions,
  groups = null,
  parentId = null,
  parentScope = null,
  allowMultiScope = false,
}) {
  const { acc, assemblyContext } = buildCriteriaAccumulator({
    scp,
    planCriteria,
    planScope,
    patternOptions,
    parentId,
    parentScope,
    allowMultiScope,
  });
  return assemblePlan(scp, { ...acc, ...assemblyContext });
}

// Like processCriteria but returns a bare CTS query when the inner criteria
// resolves to pure CTS constraints (no Optic joins needed). Returns null when
// the criteria requires an Optic plan — caller should fall back to the join path.
// The dataType constraint is intentionally omitted: callers use cts.values to
// resolve matching document IRIs, and the triple predicate already limits which
// scope's documents are valid objects.
function processCriteriaAsCts({
  scp,
  planCriteria,
  planScope = 'item',
  patternOptions,
  parentId = null,
}) {
  const { acc, assemblyContext } = buildCriteriaAccumulator({
    scp,
    planCriteria,
    planScope,
    patternOptions,
    parentId,
    // Set parentScope = planScope so the accumulator skips the dataType
    // constraint (empty-groups optimization). The caller resolves IRIs via
    // cts.values; the triple predicate already scopes the objects.
    parentScope: planScope,
  });
  if (!accContainsOnly(acc, 'ctsConstraints')) {
    return null;
  }
  return wrapCtsByLogicType(assemblyContext.logicType, acc.ctsConstraints);
}

// Needed outside the module in support of building the plans without executing them.
function getResultRowGrouping() {
  return {
    by: ['uri'],
    agg: [op.sample('dataType', op.col('dataType'))],
  };
}

// Top-level entry point called from performSearch — returns sorted and
// unsorted plans with finalization and optional sort applied.
function buildPlans({
  scp,
  planCriteria,
  planScope = 'item',
  patternOptions,
  allowMultiScope = false,
  groups,
  sortCriteria = null,
}) {
  const { acc, assemblyContext } = buildCriteriaAccumulator({
    scp,
    planCriteria,
    planScope,
    patternOptions,
    allowMultiScope,
  });

  // Unsorted plan — used by facets.
  const unsortedResultsPlan = collapseToResultRows(
    assemblePlan(scp, { ...acc, ...assemblyContext }),
    groups,
  );

  const sortedResultsPlan = buildSortedResultsPlan({
    unsortedResultsPlan,
    sortCriteria,
    acc,
    hasScoreContributingCriteria: assemblyContext.hasScoreContributingCriteria,
    assemblyContext,
    scp,
    groups,
  });

  return { sortedResultsPlan, unsortedResultsPlan };
}
//#endregion

//#region Core engine functions
// Builds the raw plan accumulator from search criteria.  Shared by both
// top-level (buildPlans) and recursive (processCriteria) paths.
function buildCriteriaAccumulator({
  scp,
  planCriteria,
  planScope = 'item',
  patternOptions,
  parentId = null,
  parentScope = null,
  allowMultiScope = false,
}) {
  const isTopLevel = !parentId;
  const uriCol = isTopLevel ? 'uri' : parentId + '_uri';
  const fragCol = isTopLevel ? 'frag' : parentId + '_frag';
  const iriCol = isTopLevel ? 'iri' : parentId + '_iri';
  const dataTypeCol = isTopLevel ? 'dataType' : parentId + '_dataType';

  if (!utils.isDefined(planCriteria)) {
    throw new InvalidSearchRequestError('search criteria must be defined.');
  }

  let scope = isTopLevel ? (planCriteria._scope ?? planScope) : planScope;

  const isMultiScope = scope === 'multi';
  if (isMultiScope) {
    validateMultiScopeCriteria(planCriteria, isTopLevel, allowMultiScope);
  }

  let searchTermNames = isMultiScope ? null : getSearchTermNames(scope);

  let { criteria, logicType } = parseCriteriaAndLogicType(planCriteria);

  // Empty-groups optimization: if the caller already constrains results to a
  // single scope and this sub-plan is for the same scope, the dataType
  // constraint on this sub-plan is redundant. Skip emitting it.
  const scopeAlreadyConstrained =
    !isTopLevel && !isMultiScope && parentScope === scope;

  const acc = createPlanAccumulator({
    scope,
    scopeAlreadyConstrained,
    uriCol,
    iriCol,
    fragCol,
    dataTypeCol,
    isMultiScope,
  });

  let usableLeafTermCount = 0;
  let hasScoreContributingCriteria = false;

  // Loop through search criteria, building the accumulator.
  // criteria.length is evaluated each iteration — NOT cached — because
  // tokenization, conjunction inlining, and pattern contributions all push
  // new entries onto the array that must be processed in the same pass.
  for (let idx = 0; idx < criteria.length; idx++) {
    const criterion = criteria[idx];

    if (isMultiScope) {
      scope = criterion._scope;
      searchTermNames = getSearchTermNames(scope);
    }

    // Used when creating a new column that needs to be joined or filtered.
    const id = sem.uuidString().replace(/-/g, '_');

    // If the criterion is a nested conjunction, resolve it to a join or inline expansion
    if (criterion.AND || criterion.OR || criterion.NOT) {
      const result = buildConjunctionJoin({
        criterion,
        logicType,
        scope,
        patternOptions,
        id,
        uriCol,
        fragCol,
        scp,
        // Parent's plan only constrains scope when the parent itself is not
        // multi-scope. Sub-plans use this to decide whether they can skip
        // their own dataType constraint and whether their pure-CTS form can
        // be folded into the parent's ctsConstraints.
        parentIsScopeConstrained: !isMultiScope,
      });
      if (result.skip) {
        // The sub-group's criteria were all filtered (e.g. stop words); treat
        // the group as non-existent so it doesn't contribute an empty plan.
      } else if (result.inlineCriteria) {
        criteria.push(...result.inlineCriteria);
      } else if (result.ctsConstraint) {
        // Pure-CTS sub-plan folded directly into our ctsConstraints; the wrap
        // in assemblePlan (and/or/notQuery) composes correctly with the
        // sub's already-wrapped query as a peer.
        acc.ctsConstraints.push(result.ctsConstraint);
      } else if (result.andOrSubPlan) {
        // Deferred: AND-encounters-OR sub-plans are combined off the outer
        // fragment in assemblePlan to avoid SPARQL fusion when 2+ are
        // chained against the same outer (which silently zeroes results or
        // blows memory). See docs/optic-lessons.md.
        acc.andOrSubPlans.push(result.andOrSubPlan);
      } else if (result.join) {
        acc.conjunctionJoins.push(result.join);
      } else {
        throw new InternalServerError(
          `buildConjunctionJoin's return did not include a recognized property: ${JSON.stringify(Object.keys(result))}`,
        );
      }
      continue;
    }

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

    // When allowed by the pattern, tokenize multi-word string values into an
    // AND group so each word is searched independently.  The returned criterion
    // is pushed onto the live criteria queue for the dynamic for-loop to pick up.
    const tokenizedCriterion = tokenizeTermValue(patternInstance, searchTerm);
    if (tokenizedCriterion) {
      criteria.push(tokenizedCriterion);
      continue;
    }

    scp.incrementCriteriaCount();
    usableLeafTermCount++;
    hasScoreContributingCriteria ||=
      patternInstance.contributesRelevanceScore();
    mergeTermPlanContributions(
      acc,
      criteria,
      patternInstance.apply(scp, searchTerm, logicType, patternOptions),
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

  // A single-branch OR is semantically equivalent to AND. Collapsing avoids
  // a joinFullOuter against the base plan, which would include every doc in
  // the search scope.
  const usableBranchCount =
    acc.conjunctionJoins.length +
    acc.andOrSubPlans.length +
    usableLeafTermCount;
  if (logicType === 'or' && usableBranchCount === 1) {
    logicType = 'and';
    for (const join of acc.conjunctionJoins) {
      if (join.type === 'joinFullOuter') {
        join.type = 'joinInner';
      }
    }
  }

  const assemblyContext = {
    fragCol,
    uriCol,
    dataTypeCol,
    scope,
    logicType,
    isTopLevel,
    hasScoreContributingCriteria,
  };
  return { acc, assemblyContext };
}

// Parses a planCriteria object into a mutable array of criteria and a logic type
// ('and', 'or', or 'not'). A bare object (no AND/OR/NOT key) is treated as a
// single-element AND array.
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
    // Single criteria are equivalent to AND
    criteria = [xdmp.toJSON(planCriteria).toObject()];
    logicType = 'and';
  }
  return {
    criteria,
    logicType,
  };
}

// Mutable accumulator for all pattern/conjunction contributions during criteria iteration.
// Initialized with scope-level base lexicons and an optional dataType constraint.
function createPlanAccumulator({
  scope,
  scopeAlreadyConstrained = false,
  uriCol,
  iriCol,
  fragCol,
  dataTypeCol,
  isMultiScope,
}) {
  return {
    lexicons: {
      [uriCol]: cts.uriReference(),
      [iriCol]: cts.iriReference(),
      [dataTypeCol]: cts.fieldReference('anyDataTypeName'),
    },
    constraints:
      isMultiScope || scopeAlreadyConstrained
        ? []
        : [op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false))],
    ctsConstraints: [],
    conjunctionJoins: [],
    // AND-encounters-OR sub-plans deferred until assemblePlan, where
    // 2+ are combined off the outer fragment before being joined back in.
    andOrSubPlans: [],
    patternJoins: [],
  };
}

// Constructs a SearchTerm for a single leaf criterion (non-conjunction).
// Resolves the term's config, applies pattern requirements, casts the value
// to the configured scalar type, validates wildcards, detects stop words,
// and selects search options.  Unusable terms are marked as such and their
// words are added to scp's ignored terms list.
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
    // When the child term is { id: value } or { iri: value } and the config specifies ID index
    // references, rewrite the search term to a simple indexedValue query on that index.  Skip when
    // the search term is transitive as valid results would be dropped.
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
  // Check the raw criteria (pre-cast JS string), not getValue() which may
  // be an xs.string typed value that fails the typeof === 'string' guard.
  const unusableWords = getUnusableTermWords(searchTerm.getCriteria());
  if (unusableWords.length > 0) {
    searchTerm.setUsable(false);
    unusableWords.forEach((w) => scp.addIgnoredTerm(w));
  }

  return searchTerm;
}

// Analyzes search criteria into validated SearchTerm objects without building
// an Optic plan or accumulator. Reuses parseCriteriaAndLogicType,
// buildLeafSearchTerm, and tokenizeTermValue so criteria interpretation is
// identical to buildCriteriaAccumulator.
//
// Returns null when the criteria are ineligible for leaf-only analysis:
//   - OR or NOT logic type
//   - Any nested conjunction (AND/OR/NOT criterion)
//   - Unrecognized term name
// Returns { terms: SearchTerm[], logicType: 'and' } when every criterion
// resolves to a usable leaf term. Returns null when all terms are unusable
// (stop words / punctuation) — the caller should treat that as ineligible.
//
// Side effect: may add ignored terms to scp via buildLeafSearchTerm.
// Harmless — on success the standard path never runs; on bail it re-adds
// the same terms.
function analyzeLeafCriteria(scp, searchCriteria, scopeName) {
  if (!searchCriteria || typeof searchCriteria !== 'object') return null;

  const { criteria, logicType } = parseCriteriaAndLogicType(searchCriteria);
  if (logicType !== 'and') return null;

  const searchTermNames = getSearchTermNames(scopeName);
  const terms = [];

  // Dynamic loop — tokenizeTermValue may push new criteria (same pattern
  // as buildCriteriaAccumulator).
  for (let idx = 0; idx < criteria.length; idx++) {
    const criterion = criteria[idx];

    if (criterion.AND || criterion.OR || criterion.NOT) return null;

    const name = Object.keys(criterion).find(
      (k) => k[0] !== '_' && searchTermNames.includes(k),
    );
    if (!name) return null;

    const searchTerm = buildLeafSearchTerm(scp, {
      criterion,
      id: `analyze_${idx}`,
      name,
      scope: scopeName,
      isTopLevel: true,
      iriCol: 'iri',
      uriCol: 'uri',
      fragCol: 'frag',
      dataTypeCol: 'dataType',
    });

    if (!searchTerm.isUsable()) continue;

    const patternInstance = SearchPatternBase.get(
      searchTerm.getSearchTermConfig().getPatternName(),
    );

    const tokenizedCriterion = tokenizeTermValue(patternInstance, searchTerm);
    if (tokenizedCriterion) {
      criteria.push(...tokenizedCriterion.AND);
      continue;
    }

    terms.push(searchTerm);
  }

  return terms.length > 0 ? { terms, logicType: 'and' } : null;
}

// Merges contributions from a pattern application into the accumulator.
// criteriaQueue is the live criteria iteration array; pattern-returned criteria are pushed there
// so they are processed in the same loop iteration pass.
function mergeTermPlanContributions(acc, criteriaQueue, contributions) {
  if (!contributions) {
    return;
  }
  Object.assign(acc.lexicons, contributions.lexicons ?? {});
  if (contributions.criteria?.length) {
    criteriaQueue.push(...contributions.criteria);
  }
  if (contributions.constraints?.length) {
    acc.constraints.push(...contributions.constraints);
  }
  if (contributions.ctsConstraints?.length) {
    acc.ctsConstraints.push(...contributions.ctsConstraints);
  }
  if (contributions.patternJoins?.length) {
    acc.patternJoins.push(...contributions.patternJoins);
  }
}

// Resolves a nested conjunction criterion (AND/OR/NOT-keyed) into either a join descriptor,
// inline criteria to be appended to the processing queue, a pure-CTS contribution to be
// folded into the parent's ctsConstraints, or a skip signal when the sub-group's criteria
// were all filtered out (e.g. stop words).
// Returns: { join: ... } | { inlineCriteria: Array } | { andOrSubPlan: ... }
//        | { ctsConstraint: ctsQuery } | { skip: true }
function buildConjunctionJoin({
  criterion,
  logicType,
  scope,
  patternOptions,
  id,
  uriCol,
  fragCol,
  scp,
  parentIsScopeConstrained,
}) {
  const makeJoinOn = () =>
    patternOptions.getPreferFragJoins()
      ? op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol(id + '_frag'))
      : op.on(op.col(uriCol), op.col(id + '_uri'));

  const singleColSelect = () =>
    patternOptions.getPreferFragJoins() ? [id + '_frag'] : [id + '_uri'];

  const fullOuterJoinCol = () =>
    patternOptions.getPreferFragJoins()
      ? op.as(fragCol, op.fragmentIdCol(id + '_frag'))
      : op.as(uriCol, op.col(id + '_uri'));

  // --- Join-descriptor builders -----------------------------------------
  // Each takes the assembled sub-plan and returns the join descriptor that
  // buildConjunctionJoin's caller will push into the parent's join queue.
  // Centralized so the 3x3 logic-type matrix below stays readable.
  const notExistsJoinDesc = (plan) => ({
    join: {
      type: 'notExistsJoin',
      right: plan.select(singleColSelect()),
      on: makeJoinOn(),
      condition: null,
    },
  });
  const innerJoinDesc = (plan) => ({
    join: {
      type: 'joinInner',
      right: plan.select(singleColSelect()),
      on: makeJoinOn(),
      condition: null,
    },
  });
  const fullOuterJoinDesc = (plan) => ({
    join: {
      type: 'joinFullOuter',
      right: plan.select([
        fullOuterJoinCol(),
        op.as('dataType', op.col(id + '_dataType')),
      ]),
      on: null,
      condition: null,
    },
  });
  // andOrSubPlan is deferred to assemblePlan; see the AND-encounters-OR arm.
  const andOrSubPlanDesc = (plan) => {
    const cols = singleColSelect();
    return {
      andOrSubPlan: {
        plan: plan.select(cols).groupBy(cols, []),
        joinCol: cols[0],
        preferFrag: patternOptions.getPreferFragJoins(),
      },
    };
  };

  // Builds the sub-accumulator and returns one of the shapes that
  // buildConjunctionJoin itself emits, so the caller can either return the
  // result directly or wrap an assembled plan via a join-descriptor builder:
  //   1) { skip: true }         — sub had no usable criteria (passes through)
  //   2) { ctsConstraint: q }   — sub is pure-CTS, folded into the parent's
  //                                ctsConstraints (passes through)
  //   3) { plan }               — sub assembled into a regular plan; the
  //                                caller wraps it with the appropriate
  //                                join-descriptor builder
  //
  // Folding requires:
  //   - parent logicType is 'and' or 'or' (NOT composition with negation
  //     conversion is not a simple peer push)
  //   - sub contributes ONLY ctsConstraints (no joins, no patternJoins, no
  //     andOrSubPlans, no extra constraints beyond the scope filter that has
  //     already been suppressed via parentScope propagation)
  // negateFold forces a folded sub to be wrapped as cts.notQuery(...) instead
  // of using the sub's own logicType. Needed when the caller pre-rewrites a
  // NOT criterion as {OR:[...]} for a notExistsJoin fallback path: the sub's
  // own logicType is then 'or', but if the sub folds we must wrap as 'not' to
  // preserve negation in the parent's ctsConstraints.
  const buildSubOrFold = (planCriteria, negateFold = false) => {
    const countBefore = scp.getCriteriaCount();
    const { acc, assemblyContext } = buildCriteriaAccumulator({
      scp,
      planCriteria,
      planScope: scope,
      patternOptions,
      parentId: id,
      // Sub-plan can drop the duplicate dataType filter only when the
      // parent's plan really constrains scope (i.e. parent is not multi).
      parentScope: parentIsScopeConstrained ? scope : null,
    });
    if (scp.getCriteriaCount() === countBefore) {
      return { skip: true };
    }
    const foldable =
      (logicType === 'and' || logicType === 'or') &&
      accContainsOnly(acc, 'ctsConstraints');
    if (foldable) {
      const wrapLogic = negateFold ? 'not' : assemblyContext.logicType;
      return {
        ctsConstraint: wrapCtsByLogicType(wrapLogic, acc.ctsConstraints),
      };
    }
    return { plan: assemblePlan(scp, { ...acc, ...assemblyContext }) };
  };

  if (criterion.AND) {
    switch (logicType) {
      case 'and':
        // AND can be inlined because we're already in an AND here
        return { inlineCriteria: criterion.AND };

      case 'or': {
        // We are in an OR and encounter an AND - full outer join (or fold)
        const sub = buildSubOrFold(criterion);
        return sub.plan ? fullOuterJoinDesc(sub.plan) : sub;
      }

      case 'not': {
        // We are in a NOT and encounter an AND - not exists join
        // (NOT context disables folding inside buildSubOrFold.)
        const sub = buildSubOrFold(criterion);
        return sub.plan ? notExistsJoinDesc(sub.plan) : sub;
      }
    }
  } else if (criterion.OR) {
    switch (logicType) {
      case 'and': {
        // AND encounters OR. Prefer the pure-CTS fold; otherwise defer the
        // sub-plan join until assemblePlan, which combines all such
        // sub-plans off the outer fragment first, then joins the combined
        // result to the outer ONCE. Chaining 2+ of these as joinInner
        // against the same outer fragment causes SPARQL fusion that
        // silently zeroes results or blows memory.
        // singleColSelect() projects [id+'_uri'] (or [id+'_frag']); the
        // groupBy on that same column dedupes and adds a materialization
        // barrier so the merger sees a single, fully-typed binding.
        const sub = buildSubOrFold(criterion);
        return sub.plan ? andOrSubPlanDesc(sub.plan) : sub;
      }

      case 'or':
        // OR can be inlined because we're already in an OR here
        return { inlineCriteria: criterion.OR };

      case 'not': {
        // We are in a NOT and encounter an OR - not exists join
        const sub = buildSubOrFold(criterion);
        return sub.plan ? notExistsJoinDesc(sub.plan) : sub;
      }
    }
  } else if (criterion.NOT) {
    switch (logicType) {
      case 'and': {
        // We are in an AND and encounter a NOT - not exists join and change to OR
        // This is equivalent and likely more performant (needs testing).
        // negateFold=true ensures a folded sub is wrapped as cts.notQuery(...)
        // so negation is preserved when the sub bypasses the notExistsJoin path.
        const sub = buildSubOrFold({ OR: criterion.NOT }, true);
        return sub.plan ? notExistsJoinDesc(sub.plan) : sub;
      }

      case 'or': {
        // We are in an OR and encounter a NOT - full outer join
        const sub = buildSubOrFold(criterion);
        return sub.plan ? fullOuterJoinDesc(sub.plan) : sub;
      }

      case 'not': {
        // We are in a NOT and encounter a NOT - inner join and change to OR
        // This is equivalent and likely more performant (needs testing)
        const sub = buildSubOrFold({ OR: criterion.NOT });
        return sub.plan ? innerJoinDesc(sub.plan) : sub;
      }
    }
  }
}

// Wraps an array of cts queries per logicType, matching the convention used
// in assemblePlan for top-level ctsConstraints (NOT → notQuery(orQuery(...))).
function wrapCtsByLogicType(logicType, ctsConstraints) {
  if (logicType === 'and') return cts.andQuery(ctsConstraints);
  if (logicType === 'or') return cts.orQuery(ctsConstraints);
  return cts.notQuery(cts.orQuery(ctsConstraints));
}

// Assembles the Optic plan by applying all accumulated constraints, CTS queries, and joins.
function assemblePlan(
  scp,
  {
    lexicons,
    constraints,
    ctsConstraints,
    conjunctionJoins,
    andOrSubPlans,
    patternJoins,
    fragCol,
    uriCol,
    dataTypeCol,
    scope,
    logicType,
    isTopLevel,
    hasScoreContributingCriteria = false,
  },
) {
  let plan = op.fromLexicons(lexicons, null, op.fragmentIdCol(fragCol));

  if (constraints.length) {
    for (const constraint of constraints) {
      plan = plan.where(constraint);
    }
  }

  if (ctsConstraints.length) {
    const ctsQuery = wrapCtsByLogicType(logicType, ctsConstraints);
    // TODO, FUNC: Scores are only requested for top-level plans. Consider
    // whether sub-plan scores should contribute to the final relevance ranking.
    const wantScore =
      isTopLevel &&
      hasScoreContributingCriteria &&
      scp.getSortCriteria()?.areScoresRequired();
    if (wantScore) {
      // Use op.fromSearch to obtain the score column for relevance sorting.
      // Only done at the top level; sub-plans use plan.where to avoid
      // 'fragmentId'/'score' column collisions when joined back in.
      const searchPlan = op.fromSearch(ctsQuery, null, null, {
        scoreMethod: 'logtfidf',
      });
      plan = plan.joinInner(
        searchPlan,
        op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol('fragmentId')),
      );
    } else {
      plan = plan.where(ctsQuery);
    }
  }

  if (conjunctionJoins.length) {
    for (const join of conjunctionJoins) {
      // Join functions are a method on the plan, so we reference them by name
      plan = plan[join.type](join.right, join.on, join.condition);
    }
  }

  // Fold AND-encounters-OR sub-plans. With 2+ such sub-plans, chaining each
  // as joinInner against the outer fragment triggers SPARQL fusion that
  // breaks the result. Instead, combine the sub-plans to each other first
  // (off the outer) on their per-branch-unique join columns, then join the
  // combined plan to the outer once.
  if (andOrSubPlans.length) {
    const first = andOrSubPlans[0];
    const mkOn = (leftName, rightName, preferFrag) =>
      preferFrag
        ? op.on(op.fragmentIdCol(leftName), op.fragmentIdCol(rightName))
        : op.on(op.col(leftName), op.col(rightName));

    let combined = first.plan;
    for (let i = 1; i < andOrSubPlans.length; i++) {
      const sp = andOrSubPlans[i];
      combined = combined.joinInner(
        sp.plan,
        mkOn(first.joinCol, sp.joinCol, first.preferFrag),
      );
    }
    const outerLeft = first.preferFrag ? fragCol : uriCol;
    plan = plan.joinInner(
      combined,
      mkOn(outerLeft, first.joinCol, first.preferFrag),
    );
  }

  if (patternJoins.length) {
    const hasNonJoinConstraints =
      constraints.length > 1 || // more than the dataType constraint.
      ctsConstraints.length > 0 ||
      conjunctionJoins.length > 0;

    if (logicType === 'or') {
      for (let i = 0; i < patternJoins.length; i++) {
        const pj = patternJoins[i];
        if (!hasNonJoinConstraints && i === 0) {
          // No other constraints exist: inner join constrains the base plan
          // instead of outer joining to an unconstrained lexicon scan.
          plan = plan.joinInner(pj.right, pj.on);
        } else {
          // Duplicate lexicon → inner join with right → align columns → full outer join.
          // Select uriCol (not fragCol) so the natural join key matches conjunction
          // joins and the final groupBy(['uri']) sees every matched document.
          const wrapped = op
            .fromLexicons(lexicons, null, op.fragmentIdCol(fragCol))
            .joinInner(pj.right, pj.on)
            .where(
              op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false)),
            )
            .select([uriCol, fragCol, dataTypeCol, ...pj.extraCols]);
          plan = plan.joinFullOuter(wrapped, null);
        }
      }
    } else if (logicType === 'not') {
      for (const pj of patternJoins) {
        plan = plan.notExistsJoin(pj.right, pj.on);
        // Extra columns not registered — notExistsJoin discards right-side data
      }
    } else {
      // AND
      for (const pj of patternJoins) {
        plan = plan.joinInner(pj.right, pj.on);
      }
    }
  }

  return plan;
}

/**
 * Applies root-level output transformations: groupBy, column renames
 * (uri→id, dataType→type), and optional orderBy.
 *
 * Distance column support was removed as it was not based on finalized requirements.
 * To re-add: (1) track pj.extraCols from patternJoins into a distanceCols array during
 * assemblePlan, (2) include each in groupBy aggregation via op.sample, and
 * (3) consolidate into a single 'distance' output column in the select (use op.fn.min
 * for multiple distance sources, filter with op.isDefined).
 *
 * @param {object} plan - The raw Optic plan to finalize.
 * @param {object} groups - `{ by, agg }` descriptors for groupBy; null to skip grouping.
 * @param {Array} sortAggregates - Aggregate expressions (e.g. `op.max`) or column name
 *   strings appended to the groupBy aggregation list. May contain types that are NOT
 *   valid in select() (such as `op.max`).
 * @param {Array} sortOrderBy - Column ordering descriptors (e.g. `op.desc(col)`) passed
 *   to orderBy.
 * @param {Array} sortSelectCols - Column references included in the final select().
 *   Defaults to `sortAggregates`, which works when the aggregates are plain column name
 *   strings. Must be overridden when `sortAggregates` contains aggregate functions
 *   (e.g. relevance sort passes `['score']` here while `sortAggregates` holds
 *   `[op.max('score', op.col('score'))]`).
 */
function collapseToResultRows(
  plan,
  groups,
  sortAggregates = [],
  sortOrderBy = [],
  sortSelectCols = sortAggregates,
) {
  if (groups) {
    plan = plan.groupBy(groups.by, groups.agg.concat(sortAggregates));
  }

  if (sortOrderBy.length > 0) {
    plan = plan.orderBy(sortOrderBy);
  }

  if (groups) {
    plan = plan.select(
      // Tack on `.concat(sortSelectCols)` to the end of the array to
      // include sort values in output (for testing).
      [op.as('id', op.col('uri')), op.as('type', op.col('dataType'))].concat(
        sortSelectCols, // TODO: remove once satisfied with sort.
      ),
    );
  }

  return plan;
}
//#endregion

//#region Facets
function calculateFacets(rows, facetRequests) {
  if (facetRequests == null || facetRequests.length === 0) {
    return null;
  }

  const requests = facetRequests.getFacetRequests();
  if (!utils.isNonEmptyArray(requests)) {
    return new FacetResponses({});
  }

  const uriList = rows.map((row) => row.id);
  if (!utils.isNonEmptyArray(uriList)) {
    return buildEmptyFacetResponses(requests);
  }

  const page = facetRequests.getPage() ?? 1;
  const pageLength = facetRequests.getPageLength() ?? 20;
  const start = (page - 1) * pageLength;
  const end = page * pageLength;
  const docsPlan = op.fromSearch(cts.documentQuery(uriList));

  const semanticConfigsByFacetName = {};
  requests.forEach((request) => {
    const facetName = request?.name;
    if (isSemanticFacet(facetName)) {
      semanticConfigsByFacetName[facetName] =
        getValidatedSemanticFacetConfig(facetName);
    }
  });

  // Optimization idea: try [plan].facetBy, which is a convenience wrapper for groupToArrays.
  const facets = {};
  requests.forEach((request) => {
    const facetName = request?.name;
    let facetSourcePlan = docsPlan;

    let constraintPlan;
    let joinOn;
    let facetValueColName = 'value';
    let countColName = 'uri';
    // isSemanticFacet throws if neither semantic nor non-semantic facet
    if (isSemanticFacet(facetName)) {
      const semanticConfig = semanticConfigsByFacetName[facetName];
      facetValueColName = semanticConfig.facetValueColName;
      countColName = semanticConfig.constraintJoinColName;
      const sourceJoinColName = semanticConfig.sourceJoinColName;

      if (sourceJoinColName === 'iri') {
        facetSourcePlan = facetSourcePlan.joinInner(
          op.fromLexicons(
            { iri: cts.iriReference() },
            null,
            op.fragmentIdCol('iriFragId'),
          ),
          op.on('fragmentId', 'iriFragId'),
        );
      }

      // Projection barrier helps avoid optimizer paths that can collapse
      // certain semantic joins to zero rows.
      facetSourcePlan = facetSourcePlan.select([sourceJoinColName]);

      constraintPlan = semanticConfig.plan;

      joinOn = op.on(sourceJoinColName, countColName);
    } else {
      const indexReference = FACETS_CONFIG[facetName].indexReference;
      if (!utils.isNonEmptyString(indexReference)) {
        throw new InvalidSearchRequestError(
          `The '${facetName}' facet is not currently supported for this operation.`,
        );
      }

      constraintPlan = op.fromLexicons(
        {
          [facetValueColName]: cts.fieldReference(indexReference),
          [countColName]: cts.uriReference(),
        },
        null,
        op.fragmentIdCol('lexFragId'),
      );
      joinOn = op.on('fragmentId', 'lexFragId');
    }

    const isDateFacet = facetName.endsWith('Date');
    const sort = request?.sort;
    const rows = facetSourcePlan
      .joinInner(constraintPlan, joinOn)
      .orderBy(op.col(facetValueColName))
      .groupBy(op.col(facetValueColName), op.count('count', countColName))
      .orderBy(
        sort === 'desc'
          ? op.desc(facetValueColName)
          : sort === 'asc'
            ? op.asc(facetValueColName)
            : op.desc('count'), // a.k.a. frequency-order
      )
      .result()
      .toArray();

    facets[facetName] = {
      totalItems: rows.length,
      facetValues: rows.slice(start, end).map((row) => {
        return {
          value: isDateFacet ? convertSecondsToDateStr(row.value) : row.value,
          count: row.count,
        };
      }),
    };
  });

  return new FacetResponses(facets);
}

function getValidatedSemanticFacetConfig(facetName) {
  const semanticConfig = SEMANTIC_FACETS_CONFIG[facetName];
  const sourceJoinColName = semanticConfig?.sourceJoinColName;
  const constraintJoinColName = semanticConfig?.constraintJoinColName;

  if (!utils.isNonEmptyString(sourceJoinColName)) {
    throw new InternalServerError(
      `Semantic facet '${facetName}' is misconfigured: missing required 'sourceJoinColName'.`,
    );
  }
  if (!utils.isNonEmptyString(constraintJoinColName)) {
    throw new InternalServerError(
      `Semantic facet '${facetName}' is misconfigured: missing required 'constraintJoinColName'.`,
    );
  }

  const planValue = semanticConfig?.plan;
  const validPlanType =
    typeof planValue?.result === 'function' &&
    typeof planValue?.export === 'function';
  if (!validPlanType) {
    throw new InternalServerError(
      `Semantic facet '${facetName}' is misconfigured: 'plan' is required and must be an Optic plan.`,
    );
  }

  return {
    ...semanticConfig,
    sourceJoinColName,
    constraintJoinColName,
  };
}

function buildEmptyFacetResponses(requests) {
  const facets = {};

  requests.forEach((request) => {
    const facetName = request?.name;
    facets[facetName] = {
      totalItems: 0,
      facetValues: [],
    };
  });

  return new FacetResponses(facets);
}
//#endregion

//#region Sort
// Resolves which sort strategy to apply based on sort criteria precedence,
// then builds and returns the sorted plan.
//
// Precedence (first match wins):
//   1. Random — bind a random column to the unsorted plan and order by it.
//   2. Non-semantic — add sort field lexicons, rebuild the plan, order by field values.
//   3. Semantic — hop to related documents via predicate, order by related field value.
//   4. Relevance — join op.fromSearch for scores (requires CTS constraints), order by score.
//   5. Unsorted — return the unsorted plan as-is.
function buildSortedResultsPlan({
  unsortedResultsPlan,
  sortCriteria,
  acc,
  hasScoreContributingCriteria = false,
  assemblyContext,
  scp,
  groups,
}) {
  if (sortCriteria?.isRandomSort()) {
    // Add a random column to the unsorted plan using .bind, then sort by it descending.
    const randomColName = 'randomSortCol';
    const planWithRandom = unsortedResultsPlan.bind(
      op.as(randomColName, op.xdmp.random()),
    );
    return planWithRandom.orderBy(op.desc(op.col(randomColName)));
  }

  if (sortCriteria?.hasNonSemanticSortDescriptors()) {
    const sortAggregates = [];
    const sortOrderBy = [];
    const sortLexicons = {};
    for (const sortDescriptor of sortCriteria.getNonSemanticSortDescriptors()) {
      const sortColName = `sort_${sortDescriptor.indexReference}`;
      sortLexicons[sortColName] = cts.fieldReference(
        sortDescriptor.indexReference,
      );
      sortAggregates.push(sortColName);
      sortOrderBy.push(
        sortDescriptor.order === 'descending'
          ? op.desc(sortColName)
          : op.asc(sortColName),
      );
    }
    const sortAcc = { ...acc, lexicons: { ...acc.lexicons, ...sortLexicons } };
    return collapseToResultRows(
      assemblePlan(scp, { ...sortAcc, ...assemblyContext }),
      groups,
      sortAggregates,
      sortOrderBy,
    );
  }

  if (sortCriteria?.hasSemanticSortOption()) {
    xdmp.setRequestTimeLimit(SEMANTIC_SORT_TIMEOUT);

    const semanticSortOption = sortCriteria.getSemanticSortOption();
    const sortByColName = 'sortByMe';
    const sortByCol = op.col(sortByColName);
    return collapseToResultRows(
      applySemanticSort(
        assemblePlan(scp, { ...acc, ...assemblyContext }),
        semanticSortOption,
        sortByColName,
      ),
      groups,
      [sortByCol],
      [
        semanticSortOption.order === 'descending'
          ? op.desc(sortByCol)
          : op.asc(sortByCol),
      ],
    );
  }

  if (
    sortCriteria?.areScoresRequired() &&
    hasScoreContributingCriteria &&
    acc.ctsConstraints.length > 0
  ) {
    // Relevance sort — use the score column produced by op.fromSearch.
    const scoreColName = 'score';
    // TODO, FUNC: Using op.max to aggregate scores across fragments. Should
    // we use op.sum (rewards matching across multiple fragments) or keep
    // op.max (uses the best-matching fragment's score)?
    const scoreAgg = op.max(scoreColName, op.col(scoreColName));
    return collapseToResultRows(
      assemblePlan(scp, { ...acc, ...assemblyContext }),
      groups,
      [scoreAgg],
      [op.desc(op.col(scoreColName))],
      [scoreColName],
    );
  }

  return unsortedResultsPlan;
}

// Applies a semantic sort to the raw assembled plan. Takes one hop from each search result
// document via the sort binding's predicate to a related document and retrieves the related
// document's field value for sorting. Collapses to one sort value per search result (min for
// ascending, max for descending) so that collapseToResultRows receives one row per uri.
function applySemanticSort(plan, sortOption, sortByColName) {
  const { predicate, indexReference, order } = sortOption;
  const expandedPredicate = expandPredicate(predicate);

  // Projection barrier: narrow to columns needed for the semantic join.
  // Prevents the Optic optimizer from collapsing the semantic join to zero rows
  // (same technique used by semantic facets).
  plan = plan.select(['uri', 'iri', 'dataType']);

  // Triple plan: source document's IRI --(predicate)--> related document's IRI.
  const triplePlan = op.fromTriples([
    op.pattern(op.col('sourceIri'), expandedPredicate, op.col('relatedIri')),
  ]);

  // Join triples to search results. Left outer preserves results with no matching
  // triple (they sort last with null sort values).
  plan = plan.joinLeftOuter(triplePlan, op.on('iri', 'sourceIri'));

  // Get the sort field value from the related document via its IRI.
  const relatedFieldPlan = op.fromLexicons(
    {
      relatedDocIri: cts.iriReference(),
      [sortByColName]: cts.fieldReference(indexReference),
    },
    null,
    op.fragmentIdCol('relatedFragId'),
  );

  plan = plan.joinLeftOuter(
    relatedFieldPlan,
    op.on('relatedIri', 'relatedDocIri'),
  );

  // Collapse to one row per search result, picking the best sort value.
  // A search result with multiple triples (e.g., co-produced items) gets
  // the max (descending) or min (ascending) sort value.
  plan = plan.groupBy(
    ['uri'],
    [
      op.sample('dataType', op.col('dataType')),
      order === 'descending'
        ? op.max(sortByColName, op.col(sortByColName))
        : op.min(sortByColName, op.col(sortByColName)),
    ],
  );

  return plan;
}
//#endregion

//#region Pagination
// Resolves the result page and slices the appropriate page of rows.
// When pageWith is specified, finds the page containing that document ID;
// otherwise uses the given page number.
function paginateResults({ rows, pageWith, page, pageLength }) {
  let resultPage;

  if (pageWith) {
    if (rows.length > MAXIMUM_PAGE_WITH_LENGTH) {
      throw new InvalidSearchRequestError(
        `The requested document could not be found in the first ${MAXIMUM_PAGE_WITH_LENGTH} results.`,
      );
    }
    const foundIndex = rows.findIndex((row) => row.id === pageWith);
    if (foundIndex === -1) {
      throw new InvalidSearchRequestError(
        `The requested document could not be found in the search results.`,
      );
    }
    resultPage = Math.ceil((foundIndex + 1) / pageLength);
  } else {
    resultPage = Math.max(page, 1);
  }

  const offset = (resultPage - 1) * pageLength;
  const searchResults = rows.slice(offset, offset + pageLength);
  return { resultPage, searchResults };
}
//#endregion

//#region Stop word / punctuation detection
const PUNCTUATION_ONLY_REGEX = /^[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]*$/;

function isUnusableWord(word) {
  const cleaned = word.replace(/^"|"$/g, '');
  return (
    PUNCTUATION_ONLY_REGEX.test(cleaned) ||
    STOP_WORDS.has(cleaned.toLowerCase())
  );
}

// Returns the unusable words from a term value.  An empty array means the
// value is usable; a non-empty array lists every stop-word / punctuation
// token that should be reported as ignored.
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
const WILDCARD_CHARS = '*?';
const WILDCARD_CHAR_REGEX = new RegExp(`[${WILDCARD_CHARS}]`);
const QUALIFYING_CHARS = '\\s\\-';
const QUALIFYING_CHARS_REGEX = new RegExp(`[${QUALIFYING_CHARS}]`);
const MINIMUM_QUALIFYING_CHAR_COUNT = 3;
const QUALIFYING_WILDCARD_REGEX = new RegExp(
  `([${WILDCARD_CHARS}][^${WILDCARD_CHARS}${QUALIFYING_CHARS}]{${MINIMUM_QUALIFYING_CHAR_COUNT},})|([^${WILDCARD_CHARS}${QUALIFYING_CHARS}]{${MINIMUM_QUALIFYING_CHAR_COUNT},}[${WILDCARD_CHARS}])`,
);
const WILDCARDS_TO_CONSOLIDATE_REGEX = new RegExp('([?*]+[*])|([*][?*]+)');

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

// Whenever an asterisk touches another wildcard character, convert to a single asterisk.
function consolidateApplicableWildcards(str) {
  let matches;
  while ((matches = str.match(WILDCARDS_TO_CONSOLIDATE_REGEX))) {
    str = str.replace(matches[0], '*');
  }
  return str;
}

// After consolidating applicable wildcards, validate there is no invalid wildcard criteria.
// strOrArr may be a string or array of strings; the given type will be returned.
// Each string may be a word or phrase.
// The value of strOrArr can be modified; caller to update their variable to this function's return,
// providing caller wants the cleaned up value(s).
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

//#region Search options resolution
// Returns an array of search options starting from an options or pattern name.
//
// At present, an options name must be provided or derived to get a non-null response.  Further,
// only the keyword search options are overridable.  Please extend if not sufficient.
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
    // Instance options override request options which override the defaults.
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
    // If the exact option is specified, that's all we need to know.
    if (overrideOptionsArr.includes('exact')) {
      return DEFAULT_SEARCH_OPTIONS_EXACT;
    }

    // Else, let's go through each override, replacing the associated default.
    let mergedOptionsArr = defaultOptionsArr;
    overrideOptionsArr.forEach((searchOption) => {
      if (SEARCH_OPTIONS_INVERSE_MAP.hasOwnProperty(searchOption)) {
        // The default option need not be present for the override to be added.
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

//#region Helper functions
function getPlanSource(plan) {
  return op
    .toSource(plan.export ? plan.export() : plan)
    .replace(/\n\s*/g, ' ')
    .replace(/"/g, "'");
}

// True iff `bucketName` is non-empty and every other content bucket is empty.
// Throws (via undefined.length) on a typo, which surfaces immediately.
function accContainsOnly(acc, bucketName) {
  if (acc[bucketName].length === 0) return false;
  return ACC_CONTENT_BUCKETS.every(
    (b) => b === bucketName || acc[b].length === 0,
  );
}

// Extracts the IRI string from a child { id: value } or { iri: value } term.
// Returns null when the value is not a direct ID/IRI reference.
function getChildId(termValue) {
  const value = termValue?.id ?? termValue?.iri ?? null;
  return typeof value === 'string' ? value : null;
}

// Could add childId.
function getChildInfo(scopeName, parentTermValue) {
  // Override when not a group.
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

  return {
    patternName,
    valueType,
  };
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

// Tokenizes a multi-word string value into an AND group criterion.
// Returns the AND criterion object when tokenization applies, or null when
// the value should not be tokenized (single word, quoted phrase, non-string,
// complete match, already tokenized, or pattern disallows it).
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

function applyPatternRequirements(searchTerm, termConfig) {
  const patternName = termConfig.getPatternName();
  const pattern = SearchPatternBase.get(patternName);

  // Validate that the pattern is registered; throw NotImplementedError if not.
  if (!pattern) {
    throw new NotImplementedError(
      `Unimplemented pattern name: ${patternName}.`,
    );
  }

  // Validate that the search term satisfies all runtime properties required by the pattern.
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
//#endregion

export {
  MAXIMUM_PAGE_WITH_LENGTH,
  analyzeLeafCriteria,
  buildPlans,
  buildSortedResultsPlan,
  getChildId,
  getFirstNonOptionPropertyName,
  getResultRowGrouping,
  hasNonOptionPropertyName,
  paginateResults,
  performSearch,
  processCriteria,
  processCriteriaAsCts,
  resolveSearchOptions,
  sanitizeAndValidateWildcardedStrings,
};
