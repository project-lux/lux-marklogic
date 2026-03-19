import {
  PATTERN_NAME_INDEXED_VALUE,
  TYPE_GROUP,
  TYPE_TERM,
  TYPE_ATOMIC,
  acceptsGroup,
  acceptsTerm,
  acceptsAtomicValue,
  applyPattern,
  isConvertIdChildToIri,
  returnsCtsQuery,
} from '../../searchPatternsLib.mjs';
import { SearchTerm } from '../../SearchTerm.mjs';
import { SearchTermConfig } from '../../SearchTermConfig.mjs';
import { STOP_WORDS } from '../../../data/stopWords.mjs';
import {
  resolveSearchOptionsName,
  sanitizeAndValidateWildcardedStrings,
  TOKEN_FIELDS,
  TOKEN_PREDICATES,
  TOKEN_TYPES,
} from '../../searchLib.mjs';
import {
  getSearchScopeFields,
  getSearchScopePredicates,
  getSearchScopeTypes,
  isSearchScopeName,
} from '../../searchScope.mjs';
import {
  InvalidSearchRequestError,
  InternalServerError,
} from '../../errorClasses.mjs';
import * as utils from '../../../utils/utils.mjs';

// ------------------ Public engine surface ------------------

// Builds a CTS query string template from JSON criteria.
// Mutates `self` for counters/values/includeTypeConstraint exactly like the monolith code.
export function generateQueryFromCriteria(
  self,
  scopeName,
  searchCriteria,
  parentSearchTerm = null,
  mustReturnCtsQuery = false,
  returnTrueForUnusableTerms = true,
) {
  // UNIT TEST CANDIDATE: dispatch across AND/OR/NOT/BOOST vs terminal
  _requireSearchCriteriaObject(searchCriteria);

  // Group operators
  if (
    Object.prototype.hasOwnProperty.call(searchCriteria, 'AND') ||
    Object.prototype.hasOwnProperty.call(searchCriteria, 'OR')
  ) {
    const isAnd = Object.prototype.hasOwnProperty.call(searchCriteria, 'AND');
    const groupName = isAnd ? 'AND' : 'OR';
    const groupArr = searchCriteria[groupName];
    _requireSearchCriteriaArray(groupArr);

    if (groupArr.length === 0) {
      return '';
    } else if (!isAnd && groupArr.length === 1) {
      return generateQueryFromCriteria(
        self,
        scopeName,
        groupArr[0],
        parentSearchTerm,
        false,
        true,
      );
    } else {
      const pieces = groupArr.map((item) =>
        generateQueryFromCriteria(
          self,
          scopeName,
          item,
          parentSearchTerm,
          true,
          isAnd,
        ),
      );
      return _wrapGroup(isAnd ? 'and' : 'or', pieces);
    }
  }

  // NOT operator
  if (Object.prototype.hasOwnProperty.call(searchCriteria, 'NOT')) {
    const notCriteria = searchCriteria.NOT;
    if (utils.isArray(notCriteria)) {
      const orCriteria = { OR: notCriteria.map((x) => x) };
      return `cts.notQuery(${generateQueryFromCriteria(self, scopeName, orCriteria, parentSearchTerm, mustReturnCtsQuery, true)})`;
    } else if (utils.isObject(notCriteria)) {
      return `cts.notQuery(${generateQueryFromCriteria(self, scopeName, notCriteria, parentSearchTerm, true, true)})`;
    } else {
      throw new InvalidSearchRequestError(
        `object or array expected for NOT search criteria but given ${JSON.stringify(searchCriteria)}`,
      );
    }
  }

  // BOOST operator
  if (Object.prototype.hasOwnProperty.call(searchCriteria, 'BOOST')) {
    if (
      utils.isArray(searchCriteria.BOOST) &&
      searchCriteria.BOOST.length === 2
    ) {
      return `cts.boostQuery(
${generateQueryFromCriteria(self, scopeName, searchCriteria.BOOST[0], parentSearchTerm, true, false)},
${generateQueryFromCriteria(self, scopeName, searchCriteria.BOOST[1], parentSearchTerm, true, false)}
)`;
    }
    throw new InvalidSearchRequestError(
      `the BOOST operator requires an array of two items.`,
    );
  }

  // Terminal / term
  let searchTerm = _parseAndValidateTerm(
    self,
    scopeName,
    searchCriteria,
    parentSearchTerm,
    mustReturnCtsQuery,
  );

  if (searchTerm.hasModifiedCriteria()) {
    return generateQueryFromCriteria(
      self,
      scopeName,
      searchTerm.getModifiedCriteria(),
      parentSearchTerm,
      mustReturnCtsQuery,
      true,
    );
  }

  if (searchTerm.isUsable()) {
    const patternResponse = applyPattern({
      searchCriteriaProcessor: self,
      searchTerm,
      searchPatternOptions: self.searchPatternOptions,
      requestOptions: self.requestOptions,
    });

    let code = '';
    if (utils.isNonEmptyString(patternResponse.codeStr)) {
      code = patternResponse.codeStr;
    }

    if (utils.isNonEmptyArray(patternResponse.values)) {
      self.values = self.values.concat(patternResponse.values);
    }

    if (patternResponse.includeTypeConstraint === false) {
      self.includeTypeConstraint = false;
    }

    self.criteriaCnt++;
    return code;
  }

  return returnTrueForUnusableTerms ? 'cts.trueQuery()' : 'cts.falseQuery()';
}

// Resolves tokens (fields/predicates/types) into a final CTS string
export function resolveTemplateTokens(self) {
  const fields = getSearchScopeFields(self.scopeName, true);
  const predicates = getSearchScopePredicates(self.scopeName);
  const types = getSearchScopeTypes(self.scopeName, false);
  const tokens = [
    { pattern: TOKEN_FIELDS, value: fields, scalarType: 'string' },
    { pattern: TOKEN_PREDICATES, value: predicates, scalarType: 'code' },
    { pattern: TOKEN_TYPES, value: types, scalarType: 'string' },
  ];
  return _resolveTokens(self.ctsQueryTemplate, tokens);
}

// ------------------ Internal helpers ------------------

function _wrapGroup(kind /* 'and' | 'or' */, pieces) {
  return `cts.${kind}Query([${pieces.join(', ')}])`;
}

// UNIT TEST CANDIDATE: quoted vs split tokenization, multi-colon handling
function _tokenizeSearchTermValue(value, leaveAsIs) {
  if (leaveAsIs) return [value];
  if (utils.isString(value)) {
    let v = value.trim();
    const quoted = v.match(/^('|").+\1$/) != null;
    if (!v.includes(' ') || quoted) return [v];
    return utils.splitHonoringPhrases(v);
  }
  throw new InternalServerError(
    `_tokenizeSearchTermValue must be given a non-null string.`,
  );
}

function _parseAndValidateTerm(
  self,
  scopeName,
  searchCriteria,
  parentSearchTerm,
  mustReturnCtsQuery,
) {
  const searchTerm = new SearchTerm()
    .addScopeName(scopeName)
    .addMustReturnCtsQuery(mustReturnCtsQuery)
    .addParentSearchTerm(parentSearchTerm);

  // Extract name and copy _options to properties
  for (const key of Object.keys(searchCriteria)) {
    if (!['_scope', '_valueType'].includes(key)) {
      if (key.startsWith('_')) {
        searchTerm.setProperty(key.substring(1), searchCriteria[key]);
      } else if (!searchTerm.hasName()) {
        const termName = key;
        searchTerm.setName(termName);
        if (!Object.prototype.hasOwnProperty.call(searchCriteria, termName)) {
          throw new InvalidSearchRequestError(
            `the '${termName}' term requires a value.`,
          );
        }
      } else {
        throw new InvalidSearchRequestError(
          `search term defines more than one term name in criteria ${JSON.stringify(searchCriteria)}`,
        );
      }
    }
  }

  if (!searchTerm.hasName()) {
    throw new InvalidSearchRequestError(
      `search term does not specify a term name in criteria ${JSON.stringify(searchCriteria)}`,
    );
  }

  const termName = searchTerm.getName();
  let termValue = searchCriteria[termName];

  // Tokenize string values into AND unless told to leave as-is
  if (utils.isString(termValue)) {
    const tokenizedValues = _tokenizeSearchTermValue(
      searchCriteria[termName],
      searchTerm.isCompleteMatch() || searchTerm.isTokenized(),
    );
    if (tokenizedValues.length > 1) {
      return searchTerm.addModifiedCriteria({
        _scope: searchTerm.getScopeName(),
        AND: tokenizedValues.map((value) => {
          const criterion = {};
          criterion[termName] = value;
          searchTerm.getPropertyNames().forEach((name) => {
            criterion[`_${name}`] = searchTerm.getProperty(name);
          });
          criterion._tokenized = true; // prevent re-tokenization
          return criterion;
        }),
      });
    }
    termValue = tokenizedValues[0];
  }

  searchTerm.setValue(termValue);

  const searchTermConfig = _getSearchTermConfig(self, scopeName, termName);
  searchTerm.setSearchTermConfig(searchTermConfig);

  // Normalize ID child → indexed string match
  if (typeof termValue === 'object') {
    if (_hasIdChildTerm(termValue) && searchTermConfig.hasIdIndexReferences()) {
      const normalized = new SearchTerm()
        .addName(`${termName}Id`)
        .addValue(termValue.id)
        .addValueType(TYPE_ATOMIC)
        .addScopeName(scopeName)
        .addSearchTermConfig(
          new SearchTermConfig({
            indexReferences: searchTermConfig.getIdIndexReferences(),
            patternName: PATTERN_NAME_INDEXED_VALUE,
            scalarType: 'string',
          }),
        );
      return normalized; // return early; caller treats modified criteria vs returned term equivalently
    } else {
      if (
        _hasIdChildTerm(termValue) &&
        isConvertIdChildToIri(searchTermConfig.getPatternName())
      ) {
        termValue.iri = termValue.id;
        delete termValue.id;
        searchTerm.setValue(termValue);
      }
      // child info
      const targetScopeName = searchTermConfig.getTargetScopeName();
      searchTerm.addChildInfo(
        _getPartialChildSearchTermInfo(
          self,
          targetScopeName || scopeName,
          termValue,
        ),
      );

      if (targetScopeName && targetScopeName !== scopeName) {
        if (!isSearchScopeName(targetScopeName)) {
          throw new InternalServerError(
            `The '${termName}' search term is configured to an invalid target scope: '${targetScopeName}'`,
          );
        }
        searchTerm.setScopeName(targetScopeName);
      }
    }
  } else if (
    searchTermConfig.hasIdIndexReferences() &&
    !searchTermConfig.hasPatternName()
  ) {
    throw new InvalidSearchRequestError(
      `the search term '${termName}' in scope '${scopeName}' only supports the 'id' child search term.`,
    );
  } else if (!acceptsAtomicValue(searchTermConfig.getPatternName())) {
    throw new InvalidSearchRequestError(
      `the search term '${termName}' in scope '${scopeName}' does not accept atomic values.`,
    );
  } else {
    searchTerm.setValueType(TYPE_ATOMIC);
  }

  // Ensure numeric weight
  if (!searchTerm.hasNumericWeight()) {
    searchTerm.setWeight(1.0);
  }

  _cleanTermValues(searchTerm);
  _ignoreIfStopWordOrPunctuationOnly(self, searchTerm);

  return searchTerm;
}

function _getPartialChildSearchTermInfo(self, scopeName, termValue) {
  // UNIT TEST CANDIDATE: heuristics for willReturnCtsQuery/valueType
  const hasGroup = _hasGroup(termValue);
  let willReturnCtsQuery = hasGroup;
  let valueType = TYPE_GROUP;
  let patternName = null;

  if (!hasGroup) {
    const termName = self.constructor.getFirstNonOptionPropertyName(termValue);
    const searchTermConfig = _getSearchTermConfig(self, scopeName, termName);
    patternName = searchTermConfig.getPatternName();
    willReturnCtsQuery = returnsCtsQuery(patternName);
    valueType =
      utils.isArray(termValue[termName]) || utils.isObject(termValue[termName])
        ? TYPE_TERM
        : TYPE_ATOMIC;
  }

  return { patternName, valueType, willReturnCtsQuery };
}

function _getSearchTermConfig(self, scopeName, termName) {
  const scopedTerms = self.searchTermsConfig[scopeName];
  if (!scopedTerms) {
    throw new InternalServerError(
      `No terms are configured to the '${scopeName}' search scope.`,
    );
  } else if (!scopedTerms[termName]) {
    throw new InvalidSearchRequestError(
      `the '${termName}' term is invalid for the '${scopeName}' search scope. Valid choices: ${Object.keys(
        scopedTerms,
      )
        .sort()
        .join(', ')}`,
    );
  }
  return new SearchTermConfig(scopedTerms[termName]);
}

function _cleanTermValues(searchTerm) {
  if (_isKeywordTerm(searchTerm)) {
    searchTerm.setValue(
      sanitizeAndValidateWildcardedStrings(searchTerm.getValue()),
    );
  }
}

function _isKeywordTerm(searchTerm) {
  const cfg = searchTerm.getSearchTermConfig();
  return (
    TYPE_ATOMIC == searchTerm.getValueType() &&
    resolveSearchOptionsName(
      cfg.getOptionsReference(),
      cfg.getPatternName(),
    ) === 'keyword'
  );
}

function _ignoreIfStopWordOrPunctuationOnly(self, searchTerm) {
  const v = searchTerm.getValue();
  const punctuationOnly = /^[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]*$/.test(
    typeof v === 'string' ? v : '',
  );
  if (
    punctuationOnly ||
    (typeof v === 'string' && STOP_WORDS.has(v.toLowerCase()))
  ) {
    searchTerm.setUsable(false);
    self.ignoredTerms.push(v);
  }
}

function _hasIdChildTerm(termValue) {
  return termValue && typeof termValue.id === 'string';
}

function _hasGroup(termValue) {
  return (
    termValue &&
    (termValue.AND || termValue.OR || termValue.NOT || termValue.BOOST)
  );
}

function _requireSearchCriteriaObject(searchCriteria) {
  if (utils.isObject(searchCriteria)) return true;
  throw new InvalidSearchRequestError(
    `object expected but given ${JSON.stringify(searchCriteria)}`,
  );
}

function _requireSearchCriteriaArray(searchCriteria) {
  if (utils.isArray(searchCriteria)) return true;
  throw new InvalidSearchRequestError(
    `array expected but given ${JSON.stringify(searchCriteria)}`,
  );
}

function _resolveTokens(template, tokenArr) {
  let out = template;
  tokenArr.forEach((t) => {
    const val = Array.isArray(t.value)
      ? utils.arrayToString(t.value, t.scalarType)
      : t.value;
    const re = new RegExp(t.pattern, 'g');
    if (utils.isNonEmptyString(out)) out = out.replace(re, val);
  });
  return out;
}
