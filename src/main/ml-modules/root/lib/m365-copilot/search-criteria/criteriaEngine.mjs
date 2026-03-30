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
} from '../../searchLib.mjs';
import { isSearchScopeName } from '../../searchScope.mjs';
import {
  InvalidSearchRequestError,
  InternalServerError,
} from '../../errorClasses.mjs';
import * as utils from '../../../utils/utils.mjs';

//#region Public function(s)
// Builds a CTS query string template from JSON criteria.
// Mutates `self` for counters/values/includeTypeConstraint exactly like the monolith code.
function generateQueryFromCriteria(
  self,
  scopeName,
  searchCriteria,
  parentSearchTerm = null,
  mustReturnCtsQuery = false,
  returnTrueForUnusableTerms = true,
) {
  self.constructor.requireSearchCriteriaObject(searchCriteria);

  // Group operators
  if (searchCriteria.AND || searchCriteria.OR) {
    const isAnd = searchCriteria.AND;
    const groupName = isAnd ? 'AND' : 'OR';
    const groupArr = searchCriteria[groupName];
    self.constructor.requireSearchCriteriaArray(groupArr);

    if (groupArr.length === 0) {
      // Ignore by not modifying ctsQueryStr
      return '';
    } else if (!isAnd && groupArr.length === 1) {
      // Don't group an OR when there is only one item.
      return generateQueryFromCriteria(
        self,
        scopeName,
        groupArr[0],
        parentSearchTerm,
        false,
        true, // process() will catch if this is the only search criteria term and it gets ignored.
      );
    } else {
      const pieces = groupArr.map((item) =>
        generateQueryFromCriteria(
          self,
          scopeName,
          item,
          parentSearchTerm,
          true,
          isAnd, // we want cts.trueQuery when within an AND.
        ),
      );
      return _wrapGroup(isAnd ? 'and' : 'or', pieces);
    }
  }

  // NOT operator
  if (searchCriteria.NOT) {
    const notCriteria = searchCriteria.NOT;
    // Accept array or object.
    if (utils.isArray(notCriteria)) {
      // Create an OR within NOT
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
  if (searchCriteria.BOOST) {
    if (
      utils.isArray(searchCriteria.BOOST) &&
      searchCriteria.BOOST.length === 2
    ) {
      // Deep copy prevents the matching query from impacting the boost query.
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

    // Unlike the CTS query that can be incorporated into a larger query, values are to be appended
    // to the values of any other search term in the same query. This is not expected to be an issue
    // with its introductory purpose of supporting related lists that execute each relationship's
    // query individually.
    if (utils.isNonEmptyArray(patternResponse.values)) {
      self.values = self.values.concat(patternResponse.values);
    }

    // A single search term has the ability to exclude the type constraint. Introduced for related lists.
    if (patternResponse.includeTypeConstraint === false) {
      self.includeTypeConstraint = false;
    }

    self.criteriaCnt++;
    return code;
  }

  return returnTrueForUnusableTerms ? 'cts.trueQuery()' : 'cts.falseQuery()';
}
//#endregion

//#region Internal helpers
function _wrapGroup(kind /* 'and' | 'or' */, pieces) {
  return `cts.${kind}Query([${pieces.join(', ')}])`;
}

function _tokenizeSearchTermValue(value, leaveAsIs) {
  // Just return the value in an array when told not to manipulate the value.
  if (leaveAsIs) return [value];
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
        // Need to check for the property's existence as zero is a valid value.
        if (!searchCriteria[termName]) {
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
          // #273: Prevent re-tokenization when the encapsulating AND gets processed.
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
    // When the term value has the 'id' property and the term config specifies an ID index
    // reference, redefine the term to match on an ID value.
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
      // Validate object term value types and set appropriate value type
      const patternName = searchTermConfig.getPatternName();
      if (_hasGroup(termValue)) {
        searchTerm.setValueType(TYPE_GROUP);
        if (!acceptsGroup(patternName)) {
          throw new InvalidSearchRequestError(
            `the '${termName}' term contains a group but is not allowed to.`,
          );
        }
      } else if (self.constructor.hasNonOptionPropertyName(termValue)) {
        searchTerm.setValueType(TYPE_TERM);
        if (!acceptsTerm(patternName)) {
          throw new InvalidSearchRequestError(
            `the '${termName}' term contains another term but is not allowed to.`,
          );
        }
      }

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

  // Ignore punctuation-only terms and stop words
  _ignoreIfStopWordOrPunctuationOnly(self, searchTerm);

  return searchTerm;
}

function _getPartialChildSearchTermInfo(self, scopeName, termValue) {
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

// Get a search term's configuration by scope name and term name. Exception thrown when an invalid combination.
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
//#endregion

export { generateQueryFromCriteria };
