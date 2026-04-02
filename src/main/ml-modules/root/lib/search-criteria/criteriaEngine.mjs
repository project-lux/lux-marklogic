//#region Imports
import { SearchCriteriaProcessor } from '../SearchCriteriaProcessor.mjs';
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
} from '../searchPatternsLib.mjs';
import { SearchTerm } from '../SearchTerm.mjs';
import { SearchTermConfig } from '../SearchTermConfig.mjs';
import { STOP_WORDS } from '../../data/stopWords.mjs';
import {
  resolveSearchOptionsName,
  sanitizeAndValidateWildcardedStrings,
} from '../searchLib.mjs';
import { isSearchScopeName } from '../searchScope.mjs';
import { SEARCH_OPTIONS_NAME_KEYWORD } from '../appConstants.mjs';
import {
  InvalidSearchRequestError,
  InternalServerError,
} from '../errorClasses.mjs';
import * as utils from '../../utils/utils.mjs';
//#endregion

//#region Public function(s)
/**
 * Builds a CTS query string template from JSON criteria. Processes search criteria objects
 * containing operators (AND, OR, NOT, BOOST) or individual search terms, returning executable
 * CTS query code. Mutates the searchCriteriaProcessor for counters, values, and type constraints.
 *
 * @param {Object} searchCriteriaProcessor - The search criteria processor instance (mutated for state)
 * @param {Object} params - Parameters object containing search configuration
 * @param {string} params.scopeName - The search scope name (e.g., 'agent', 'work')
 * @param {Object} params.searchCriteria - The search criteria object to process
 * @param {SearchTerm|null} [params.parentSearchTerm=null] - Optional parent search term context
 * @param {boolean} [params.mustReturnCtsQuery=false] - Whether result must be a CTS query
 * @param {boolean} [params.returnTrueForUnusableTerms=true] - Whether to return trueQuery for unusable terms
 * @returns {string} CTS query string template ready for execution
 */
function generateQueryFromCriteria(searchCriteriaProcessor, params) {
  const {
    scopeName,
    searchCriteria,
    parentSearchTerm = null,
    mustReturnCtsQuery = false,
    returnTrueForUnusableTerms = true,
  } = params;
  SearchCriteriaProcessor.requireSearchCriteriaObject(searchCriteria);

  // Group operators
  if (searchCriteria.AND || searchCriteria.OR) {
    return _handleGroupOperators(searchCriteriaProcessor, params);
  }

  // NOT operator
  if (searchCriteria.NOT) {
    return _handleNotOperator(searchCriteriaProcessor, params);
  }

  // BOOST operator
  if (searchCriteria.BOOST) {
    return _handleBoostOperator(searchCriteriaProcessor, params);
  }

  // Individual search term
  let searchTerm = _parseAndValidateTerm(searchCriteriaProcessor, params);

  if (searchTerm.hasModifiedCriteria()) {
    return generateQueryFromCriteria(searchCriteriaProcessor, {
      scopeName,
      searchCriteria: searchTerm.getModifiedCriteria(),
      parentSearchTerm,
      mustReturnCtsQuery,
      returnTrueForUnusableTerms: true,
    });
  }

  if (searchTerm.isUsable()) {
    const patternResponse = applyPattern({
      searchCriteriaProcessor: searchCriteriaProcessor,
      searchTerm,
      searchPatternOptions: searchCriteriaProcessor.getSearchPatternOptions(),
      requestOptions: searchCriteriaProcessor.getRequestOptions(),
    });

    let code = '';
    if (utils.isNonEmptyString(patternResponse.codeStr)) {
      code = patternResponse.codeStr;
    }

    // Unlike the CTS query that can be incorporated into a larger query, values are to be appended
    // to the values of any other search term in the same query. This is not expected to be an issue
    // with its introductory purpose of supporting related lists that execute each relationship's
    // query individually.
    if (utils.isNonEmptyArray(patternResponse.values)) {
      searchCriteriaProcessor.appendValues(patternResponse.values);
    }

    // A single search term has the ability to exclude the type constraint. Introduced for related lists.
    if (patternResponse.includeTypeConstraint === false) {
      searchCriteriaProcessor.setIsTypeConstraintEnabled(false);
    }

    searchCriteriaProcessor.incrementCriteriaCount();
    return code;
  }

  return returnTrueForUnusableTerms ? 'cts.trueQuery()' : 'cts.falseQuery()';
}
//#endregion

//#region Internal helpers
function _handleGroupOperators(searchCriteriaProcessor, params) {
  const {
    scopeName,
    searchCriteria,
    parentSearchTerm,
    mustReturnCtsQuery,
    returnTrueForUnusableTerms,
  } = params;
  const isAnd = searchCriteria.hasOwnProperty('AND');
  const groupName = isAnd ? 'AND' : 'OR';
  const groupArr = searchCriteria[groupName];
  SearchCriteriaProcessor.requireSearchCriteriaArray(groupArr);

  if (groupArr.length === 0) {
    // Ignore by not modifying ctsQueryStr
    return '';
  } else if (!isAnd && groupArr.length === 1) {
    // Don't group an OR when there is only one item.
    return generateQueryFromCriteria(searchCriteriaProcessor, {
      scopeName,
      searchCriteria: groupArr[0],
      parentSearchTerm,
      mustReturnCtsQuery: false,
      returnTrueForUnusableTerms: true, // process() will catch if this is the only search criteria term and it gets ignored.
    });
  } else {
    const pieces = groupArr.map((item) =>
      generateQueryFromCriteria(searchCriteriaProcessor, {
        scopeName,
        searchCriteria: item,
        parentSearchTerm,
        mustReturnCtsQuery: true,
        returnTrueForUnusableTerms: isAnd, // we want cts.trueQuery when within an AND.
      }),
    );
    return `cts.${isAnd ? 'and' : 'or'}Query([${pieces.join(', ')}])`;
  }
}

function _handleNotOperator(searchCriteriaProcessor, params) {
  const {
    scopeName,
    searchCriteria,
    parentSearchTerm,
    mustReturnCtsQuery,
    returnTrueForUnusableTerms,
  } = params;
  const notCriteria = searchCriteria.NOT;
  // Accept array or object.
  if (utils.isArray(notCriteria)) {
    // Create an OR within NOT
    const orCriteria = { OR: [...notCriteria] };
    return `cts.notQuery(${generateQueryFromCriteria(searchCriteriaProcessor, {
      scopeName,
      searchCriteria: orCriteria,
      parentSearchTerm,
      mustReturnCtsQuery,
      returnTrueForUnusableTerms: true,
    })})`;
  } else if (utils.isObject(notCriteria)) {
    return `cts.notQuery(${generateQueryFromCriteria(searchCriteriaProcessor, {
      scopeName,
      searchCriteria: notCriteria,
      parentSearchTerm,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    })})`;
  } else {
    throw new InvalidSearchRequestError(
      `object or array expected for NOT search criteria but given ${JSON.stringify(searchCriteria)}`,
    );
  }
}

function _handleBoostOperator(searchCriteriaProcessor, params) {
  const {
    scopeName,
    searchCriteria,
    parentSearchTerm,
    mustReturnCtsQuery,
    returnTrueForUnusableTerms,
  } = params;
  if (
    utils.isArray(searchCriteria.BOOST) &&
    searchCriteria.BOOST.length === 2
  ) {
    return `cts.boostQuery(
${generateQueryFromCriteria(searchCriteriaProcessor, {
  scopeName,
  searchCriteria: searchCriteria.BOOST[0],
  parentSearchTerm,
  mustReturnCtsQuery: true,
  returnTrueForUnusableTerms: false,
})},
${generateQueryFromCriteria(searchCriteriaProcessor, {
  scopeName,
  searchCriteria: searchCriteria.BOOST[1],
  parentSearchTerm,
  mustReturnCtsQuery: true,
  returnTrueForUnusableTerms: false,
})}
)`;
  }
  throw new InvalidSearchRequestError(
    `the BOOST operator requires an array of two items.`,
  );
}

/**
 * Parses and validates an individual search term from criteria object. Handles name extraction,
 * property copying, string tokenization, object term processing, and validation. When determined
 * usable (check searchTerm.isUsable), the returned search term is fully configured and ready for
 * its pattern to be applied.
 *
 * @param {Object} searchCriteriaProcessor - The search criteria processor instance
 * @param {Object} params - Parameters object containing search configuration
 * @param {string} params.scopeName - The search scope name
 * @param {Object} params.searchCriteria - The search criteria object containing the term
 * @param {SearchTerm|null} params.parentSearchTerm - Optional parent search term context
 * @param {boolean} params.mustReturnCtsQuery - Whether result must be a CTS query
 * @returns {SearchTerm} Parsed and validated search term with configuration, value, and usability set
 */
function _parseAndValidateTerm(searchCriteriaProcessor, params) {
  const { scopeName, searchCriteria, parentSearchTerm, mustReturnCtsQuery } =
    params;
  const searchTerm = new SearchTerm()
    .addScopeName(scopeName)
    .addMustReturnCtsQuery(mustReturnCtsQuery)
    .addParentSearchTerm(parentSearchTerm);

  // Extract name and copy _options to properties
  _extractTermNameAndProperties(searchTerm, searchCriteria);
  const termName = searchTerm.getName();

  // Tokenize string values into AND unless told to leave as-is
  const tokenizationResult = _handleStringTokenization(
    searchTerm,
    searchCriteria,
  );
  if (tokenizationResult.replaced) {
    return tokenizationResult.searchTerm;
  }

  const searchTermConfig = _getSearchTermConfig(
    searchCriteriaProcessor.getSearchTermsConfig(),
    scopeName,
    termName,
  );
  searchTerm.setSearchTermConfig(searchTermConfig);

  // Handle non-atomic values, else perform various validations before accepting the atomic value.
  if (typeof searchTerm.getValue() === 'object') {
    const objectTermResult = _handleObjectTermValue(
      searchCriteriaProcessor.getSearchTermsConfig(),
      searchTerm,
    );
    if (objectTermResult.replaced) {
      return objectTermResult.searchTerm;
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

  // Ignore punctuation-only terms and stop words
  _ignoreIfStopWordOrPunctuationOnly(searchCriteriaProcessor, searchTerm);

  return searchTerm;
}

/**
 * Extracts the term name and copies option properties from search criteria to search term.
 * Iterates through criteria keys, filtering out reserved keys (_scope, _valueType), setting
 * underscore-prefixed properties as term options, and identifying the single term name.
 * Validates that exactly one term name exists and has a value (including zero).
 *
 * @param {SearchTerm} searchTerm - The search term object to populate (mutated)
 * @param {Object} searchCriteria - The search criteria object to extract from
 * @throws {InvalidSearchRequestError} When term has no value, multiple term names, or no term name
 */
function _extractTermNameAndProperties(searchTerm, searchCriteria) {
  for (const key of Object.keys(searchCriteria)) {
    if (!['_scope', '_valueType'].includes(key)) {
      if (key.startsWith('_')) {
        searchTerm.setProperty(key.substring(1), searchCriteria[key]);
      } else if (!searchTerm.hasName()) {
        const termName = key;
        searchTerm.setName(termName);
        // Need to check for the property's existence as zero is a valid value.
        if (!searchCriteria.hasOwnProperty(termName)) {
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
}

/**
 * Handles string tokenization for search terms. Splits multi-word strings into AND queries
 * or sets single token values on the search term.
 *
 * @param {SearchTerm} searchTerm - The search term being processed
 * @param {Object} searchCriteria - The original search criteria object
 * @returns {{replaced: boolean, searchTerm: SearchTerm}} Result indicating if term was tokenized
 *   - replaced: true if string was split into multiple tokens (returns modified term)
 *   - replaced: false if single token or non-string (returns original term with value set)
 */
function _handleStringTokenization(searchTerm, searchCriteria) {
  const termName = searchTerm.getName();
  const termValue = searchCriteria[termName];
  if (!utils.isString(termValue)) {
    searchTerm.setValue(termValue);
    return { replaced: false, searchTerm };
  }

  const tokenizedValues = _tokenizeSearchTermValue(
    searchCriteria[termName],
    searchTerm.isCompleteMatch() || searchTerm.isTokenized(),
  );

  if (tokenizedValues.length > 1) {
    const modifiedTerm = searchTerm.addModifiedCriteria({
      _scope: searchTerm.getScopeName(),
      AND: tokenizedValues.map((value) => {
        const criterion = {};
        criterion[termName] = value;
        searchTerm.getPropertyNames().forEach((name) => {
          criterion[`_${name}`] = searchTerm.getProperty(name);
        });
        // #273: Prevent re-tokenization when the encapsulating AND gets processed.
        criterion._tokenized = true; // prevent re-tokenization
        return criterion;
      }),
    });
    return { replaced: true, searchTerm: modifiedTerm };
  }

  searchTerm.setValue(tokenizedValues[0]);
  return { replaced: false, searchTerm };
}

function _tokenizeSearchTermValue(value, leaveAsIs) {
  // Just return the value in an array when told not to manipulate the value.
  if (leaveAsIs) return utils.toArray(value);
  if (utils.isString(value)) {
    let v = value.trim();
    // Do not tokenize when (there isn't a space or) the value starts and ends with matching quote characters.
    const quoted = v.match(/^('|").+\1$/) != null;
    if (!v.includes(' ') || quoted) return [v];
    return utils.splitHonoringPhrases(v);
  }
  throw new InternalServerError(
    `_tokenizeSearchTermValue must be given a non-null string.`,
  );
}

// Get a search term's configuration by scope name and term name. Exception thrown when an invalid combination.
function _getSearchTermConfig(searchTermsConfig, scopeName, termName) {
  const scopedTerms = searchTermsConfig[scopeName];
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

/**
 * Handles object term values, normalizing ID child terms or processing complex objects.
 * When object contains 'id' property and term config has ID index references, creates
 * a normalized ID term. Otherwise validates and processes the object.
 *
 * @param {Object} searchTermsConfig - The resolved search terms configuration for the current user's unit
 * @param {SearchTerm} searchTerm - The search term being processed (contains all needed info)
 * @returns {{replaced: boolean, searchTerm: SearchTerm}} Result indicating if term was replaced
 *   - replaced: true if object was normalized to ID term (returns new normalized term)
 *   - replaced: false if object was processed in place (returns modified original term)
 */
function _handleObjectTermValue(searchTermsConfig, searchTerm) {
  const termValue = searchTerm.getValue();
  const searchTermConfig = searchTerm.getSearchTermConfig();

  // When the term value has the 'id' property and the term config specifies an ID index
  // reference, redefine the term to match on an ID value.
  if (_hasIdChildTerm(termValue) && searchTermConfig.hasIdIndexReferences()) {
    return { replaced: true, searchTerm: _createNormalizedIdTerm(searchTerm) };
  }

  // Validate object term value types and set appropriate value type
  _validateAndSetValueType(searchTerm);

  // Handle ID to IRI conversion
  if (
    _hasIdChildTerm(termValue) &&
    isConvertIdChildToIri(searchTermConfig.getPatternName())
  ) {
    termValue.iri = termValue.id;
    delete termValue.id;
    searchTerm.setValue(termValue);
  }

  // Add child info and handle target scope changes
  _handleChildInfoAndTargetScope(searchTermsConfig, searchTerm);

  return { replaced: false, searchTerm };
}

function _createNormalizedIdTerm(searchTerm) {
  const termName = searchTerm.getName();
  const termValue = searchTerm.getValue();
  const searchTermConfig = searchTerm.getSearchTermConfig();
  const scopeName = searchTerm.getScopeName();

  return new SearchTerm()
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
}

function _validateAndSetValueType(searchTerm) {
  const termName = searchTerm.getName();
  const termValue = searchTerm.getValue();
  const searchTermConfig = searchTerm.getSearchTermConfig();
  const patternName = searchTermConfig.getPatternName();

  if (_hasGroup(termValue)) {
    searchTerm.setValueType(TYPE_GROUP);
    if (!acceptsGroup(patternName)) {
      throw new InvalidSearchRequestError(
        `the '${termName}' term contains a group but is not allowed to.`,
      );
    }
  } else if (SearchCriteriaProcessor.hasNonOptionPropertyName(termValue)) {
    searchTerm.setValueType(TYPE_TERM);
    if (!acceptsTerm(patternName)) {
      throw new InvalidSearchRequestError(
        `the '${termName}' term contains another term but is not allowed to.`,
      );
    }
  }
}

function _handleChildInfoAndTargetScope(searchTermsConfig, searchTerm) {
  const termValue = searchTerm.getValue();
  const searchTermConfig = searchTerm.getSearchTermConfig();
  const scopeName = searchTerm.getScopeName();
  const targetScopeName = searchTermConfig.getTargetScopeName();

  searchTerm.addChildInfo(
    _getPartialChildSearchTermInfo(
      searchTermsConfig,
      targetScopeName || scopeName,
      termValue,
    ),
  );

  if (targetScopeName && targetScopeName !== scopeName) {
    if (!isSearchScopeName(targetScopeName)) {
      throw new InternalServerError(
        `The '${searchTerm.getName()}' search term is configured to an invalid target scope: '${targetScopeName}'`,
      );
    }
    searchTerm.setScopeName(targetScopeName);
  }
}

function _getPartialChildSearchTermInfo(
  searchTermsConfig,
  scopeName,
  termValue,
) {
  const hasGroup = _hasGroup(termValue);
  let willReturnCtsQuery = hasGroup;
  let valueType = TYPE_GROUP;
  let patternName = null;

  if (!hasGroup) {
    const termName =
      SearchCriteriaProcessor.getFirstNonOptionPropertyName(termValue);
    const searchTermConfig = _getSearchTermConfig(
      searchTermsConfig,
      scopeName,
      termName,
    );
    patternName = searchTermConfig.getPatternName();
    willReturnCtsQuery = returnsCtsQuery(patternName);
    valueType =
      utils.isArray(termValue[termName]) || utils.isObject(termValue[termName])
        ? TYPE_TERM
        : TYPE_ATOMIC;
  }

  return { patternName, valueType, willReturnCtsQuery };
}

function _cleanTermValues(searchTerm) {
  // Apply sanitization for wildcard strings when dealing with keyword terms
  if (_isKeywordTerm(searchTerm)) {
    // The return of this function could include cleaned up values.
    searchTerm.setValue(
      sanitizeAndValidateWildcardedStrings(searchTerm.getValue()),
    );
  }
}

function _isKeywordTerm(searchTerm) {
  const cfg = searchTerm.getSearchTermConfig();
  return (
    TYPE_ATOMIC === searchTerm.getValueType() &&
    SEARCH_OPTIONS_NAME_KEYWORD ===
      resolveSearchOptionsName(cfg.getOptionsReference(), cfg.getPatternName())
  );
}

function _ignoreIfStopWordOrPunctuationOnly(
  searchCriteriaProcessor,
  searchTerm,
) {
  const v = searchTerm.getValue();
  if (typeof v === 'string') {
    const punctuationOnly = /^[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]+$/.test(v);
    if (v.length === 0 || punctuationOnly || STOP_WORDS.has(v.toLowerCase())) {
      searchTerm.setUsable(false);
      searchCriteriaProcessor.addIgnoredTerm(v);
    }
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
//#endregion

export { generateQueryFromCriteria };
