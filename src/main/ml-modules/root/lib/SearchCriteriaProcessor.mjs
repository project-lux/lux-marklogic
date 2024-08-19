import { getSearchTermsConfig } from '../config/searchTermsConfig.mjs';
import { SearchTerm } from './SearchTerm.mjs';
import { SearchTermConfig } from './SearchTermConfig.mjs';
import { SearchPatternOptions } from './SearchPatternOptions.mjs';
import { STOP_WORDS } from '../data/stopWords.mjs';
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
} from './searchPatternsLib.mjs';
import {
  resolveSearchOptionsName,
  sanitizeAndValidateWildcardedStrings,
  TOKEN_FIELDS,
  TOKEN_PREDICATES,
  TOKEN_TYPES,
} from './searchLib.mjs';
import {
  getSearchScopeFields,
  getSearchScopePredicates,
  getSearchScopeTypes,
  isSearchScopeName,
} from './searchScope.mjs';
import {
  REG_EXP_NEAR_OPERATOR,
  SEARCH_GRAMMAR_OPERATORS,
  SEARCH_OPTIONS_NAME_KEYWORD,
} from './appConstants.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
} from './mlErrorsLib.mjs';
import * as utils from '../utils/utils.mjs';

const SEARCH_TERMS_CONFIG = getSearchTermsConfig();

const START_OF_GENERATED_QUERY = `
const op = require("/MarkLogic/optic");
const crm = op.prefixer("http://www.cidoc-crm.org/cidoc-crm/");
const la = op.prefixer("https://linked.art/ns/terms/");
const lux = op.prefixer("https://lux.collections.yale.edu/ns/");
const skos = op.prefixer("http://www.w3.org/2004/02/skos/core#");`;

const SearchCriteriaProcessor = class {
  constructor(filterResults, facetsAreLikely, synonymsEnabled) {
    // Capture all constructor parameters as request options, enabling search patterns to utilize.
    this.requestOptions = {
      filterResults,
      facetsAreLikely,
      synonymsEnabled,
    };

    // Given to process()
    this.searchCriteria;
    this.scopeName;
    this.searchPatternOptions;
    this.includeTypeConstraint; // Patterns can override to false.
    this.page;
    this.pageLength;
    this.sortCriteria;

    // Populated via process()
    this.resolvedSearchCriteria = null;
    this.criteriaCnt = 0;
    this.ignoredTerms = [];
    this.ctsQueryStrWithTokens;
    this.ctsQueryStr = '';
    this.valuesOnly = false;
    this.values = [];
  }

  process(
    searchCriteria,
    scopeName,
    searchPatternOptions,
    includeTypeConstraint,
    page,
    pageLength,
    sortCriteria,
    valuesOnly
  ) {
    this.resolvedSearchCriteria =
      SearchCriteriaProcessor._requireSearchCriteriaJson(
        scopeName,
        searchCriteria
      );
    this.page = page;
    this.pageLength = pageLength;
    this.sortCriteria = sortCriteria;
    this.valuesOnly = valuesOnly;
    this.searchPatternOptions = searchPatternOptions
      ? searchPatternOptions
      : new SearchPatternOptions();
    this.includeTypeConstraint = includeTypeConstraint;

    // Require a valid scope name.
    if (this.resolvedSearchCriteria._scope) {
      const scopeName = this.resolvedSearchCriteria._scope.trim().toLowerCase();
      if (isSearchScopeName(scopeName)) {
        this.scopeName = scopeName;
        delete this.resolvedSearchCriteria._scope;

        // Some search patterns need to know the requested search scope
        this.requestOptions.scopeName = scopeName;
      } else {
        throw new InvalidSearchRequestError(
          `'${this.resolvedSearchCriteria._scope}' is not a valid search scope.`
        );
      }
    } else {
      throw new InvalidSearchRequestError(`search scope not specified.`);
    }

    this.ctsQueryStrWithTokens = this.generateQueryFromCriteria(
      this.scopeName,
      this.resolvedSearchCriteria,
      null,
      true, // Must return a CTS query.
      false // Return cts.falseQuery when the top-level term is unusable.
    );

    // Protect from a repo-wide search as repo-wide facets are expensive to calculate, even when
    // applying a scope search.
    if (
      this.criteriaCnt < 1 ||
      !utils.isNonEmptyString(this.ctsQueryStrWithTokens)
    ) {
      if (this.ignoredTerms.length > 0) {
        throw new InvalidSearchRequestError(
          `the search criteria given only contains '${this.ignoredTerms.join(
            "', '"
          )}', which is an ignored term(s). Please consider creating phrases using double quotes and/or adding additional criteria.`
        );
      }
      throw new InvalidSearchRequestError(`more search criteria is required.`);
    }

    // Conditionally add type constraint, using a token for search scope-specific estimates.
    if (this.includeTypeConstraint) {
      this.ctsQueryStrWithTokens = `cts.andQuery([
          cts.jsonPropertyValueQuery('dataType', ${TOKEN_TYPES}, ['exact']),
          ${this.ctsQueryStrWithTokens}
        ])`;
    }

    this.ctsQueryStr = this.resolveTokens(
      getSearchScopeFields(this.scopeName, true), // default to all
      getSearchScopePredicates(this.scopeName), // defaults to any
      getSearchScopeTypes(this.scopeName, false) // default to none
    );
  }

  // Get the search criteria, in the JSON search grammar.
  getSearchCriteria() {
    return this.resolvedSearchCriteria;
  }

  hasSearchScope() {
    return utils.isNonEmptyString(this.scopeName);
  }

  getSearchScope() {
    return this.scopeName;
  }

  getRequestOptions() {
    return this.requestOptions;
  }

  getIgnoredTerms() {
    return this.ignoredTerms;
  }

  // Certain search patterns implement an option compelling them to return values versus a CTS query.
  // This was introduced in support of related lists.
  getValues() {
    return this.values;
  }

  getEstimate() {
    return cts.estimate(
      SearchCriteriaProcessor.evalQueryString(this.getCtsQueryStr(false))
    );
  }

  getSearchResults() {
    return utils.evalInContentDatabase(this.getCtsQueryStr(true)).toArray()[0];
  }

  // Get query.  If you're looking for the query with different token values, use resolveTokens.
  getCtsQueryStr(withSearchResults = true) {
    // Finalize the query
    this.ctsQueryStr =
      this.ctsQueryStr.length > 0 ? this.ctsQueryStr : cts.parse('');

    if (withSearchResults === true) {
      // Concatenate the search options
      const searchOptionsArr = [
        this.requestOptions.filterResults === true
          ? '"filtered"'
          : '"unfiltered"',
        this.requestOptions.facetsAreLikely === true
          ? '"faceted"'
          : '"unfaceted"',
        this.sortCriteria.getSortOptions(),
      ];
      if (!this.sortCriteria.areScoresRequired()) {
        searchOptionsArr.push('"score-zero"');
      }
      const searchOptionsStr = utils.arrayToString(searchOptionsArr, 'code');

      return `${START_OF_GENERATED_QUERY}
        const docs = fn.subsequence(
          cts.search(${this.ctsQueryStr}, ${searchOptionsStr}), 
          ${utils.getStartingPaginationIndexForSubsequence(
            this.page,
            this.pageLength
          )}, 
          ${this.pageLength}
        ).toArray();
        const results = [];
        for (const doc of docs) {
          results.push({id: doc.baseURI, type: doc.xpath('/json/type')});
        }
        results;`;
    }

    // Only the query was requested (i.e., do not wrap in cts.search).
    return this.ctsQueryStr;
  }

  /**
   * Public: resolve tokens within query string.  This assists in the support of providing estimates for additional search scopes.
   *
   * @param {Array} fieldsArr - Array of field names to apply within the returned query string.
   * @param {Array} predicatesArr - Array of predicates to apply within the returned query string.
   * @param {Array} typesArr - Array of types to apply within the returned query string.
   * @returns {String} Query string after applying parameter values.
   */
  resolveTokens(fieldsArr, predicatesArr, typesArr) {
    return this._resolveTokens([
      {
        pattern: TOKEN_FIELDS,
        value: fieldsArr,
        scalarType: 'string',
      },
      {
        pattern: TOKEN_PREDICATES,
        value: predicatesArr,
        scalarType: 'code',
      },
      {
        pattern: TOKEN_TYPES,
        value: typesArr,
        scalarType: 'string',
      },
    ]);
  }

  /**
   * Private: resolve tokens within query string.  This assists in the support of providing estimates
   * for additional search scopes.
   *
   * @param {Array} tokenArr - Array of objects where each object specifies the following properties:
   *    pattern: The token's pattern, which may be found in the optimized plan and CTS query.
   *    value: The value to replace the token with (all instances).  Arrays are "stringified";
   *    all other values are used as is --may want to quote strings.
   * @returns {String} Query after resolving tokens.
   */
  _resolveTokens(tokenArr) {
    let ctsQueryStr = this.ctsQueryStrWithTokens;
    tokenArr.forEach((token) => {
      const val = Array.isArray(token.value)
        ? utils.arrayToString(token.value, token.scalarType)
        : token.value;
      const regEx = new RegExp(token.pattern, 'g');
      if (utils.isNonEmptyString(ctsQueryStr)) {
        ctsQueryStr = ctsQueryStr.replace(regEx, val);
      }
    });
    return ctsQueryStr;
  }

  generateQueryFromCriteria(
    scopeName,
    searchCriteria,
    parentSearchTerm = null,
    mustReturnCtsQuery = false,
    returnTrueForUnusableTerms = true
  ) {
    let ctsQueryStr = '';
    SearchCriteriaProcessor._requireSearchCriteriaObject(searchCriteria);

    if (searchCriteria.AND || searchCriteria.OR) {
      const isAnd = searchCriteria.hasOwnProperty('AND');
      const groupName = isAnd ? 'AND' : 'OR';
      const groupArr = searchCriteria[groupName];
      SearchCriteriaProcessor._requireSearchCriteriaArray(groupArr);
      if (groupArr.length === 0) {
        // Ignore by not modifying ctsQueryStr
        return;
      } else if (!isAnd && groupArr.length === 1) {
        // Don't group an OR when there is only one item.
        ctsQueryStr = this.generateQueryFromCriteria(
          scopeName,
          groupArr[0],
          parentSearchTerm,
          false,
          true // process() will catch if this is the only search criteria term and it gets ignored.
        );
      } else {
        ctsQueryStr += `cts.${groupName.toLowerCase()}Query([`;
        groupArr.forEach((item, idx) => {
          ctsQueryStr += (idx > 0 ? ', ' : '').concat(
            this.generateQueryFromCriteria(
              scopeName,
              item,
              parentSearchTerm,
              true,
              isAnd // we want cts.trueQuery when within an AND.
            )
          );
        });
        ctsQueryStr += '])';
      }
    } else if (searchCriteria.NOT) {
      const notCriteria = searchCriteria.NOT;
      // Accept array or object.
      if (utils.isArray(notCriteria)) {
        // Create an AND within NOT
        const andCriteria = {
          AND: notCriteria.map((item) => {
            return item;
          }),
        };
        ctsQueryStr = `cts.notQuery(${this.generateQueryFromCriteria(
          scopeName,
          andCriteria,
          parentSearchTerm,
          mustReturnCtsQuery, // no need to override.
          true // ANDs impose their own value.
        )})`;
      } else if (utils.isObject(notCriteria)) {
        ctsQueryStr = `cts.notQuery(${this.generateQueryFromCriteria(
          scopeName,
          notCriteria,
          parentSearchTerm,
          true,
          true // We want cts.trueQuery so as to avoid cts.notQuery(cts.falseQuery)
        )})`;
      } else {
        throw new InvalidSearchRequestError(
          `object or array expected for NOT search criteria but given ${JSON.stringify(
            searchCriteria
          )}`
        );
      }
    } else if (searchCriteria.BOOST) {
      if (
        utils.isArray(searchCriteria.BOOST) &&
        searchCriteria.BOOST.length === 2
      ) {
        // Deep copy prevents the matching query from impacting the boost query.
        ctsQueryStr = `cts.boostQuery(
          ${this.generateQueryFromCriteria(
            scopeName,
            searchCriteria.BOOST[0],
            parentSearchTerm,
            true,
            false // Do not search for everything.
          )},
          ${this.generateQueryFromCriteria(
            scopeName,
            searchCriteria.BOOST[1],
            parentSearchTerm,
            true,
            false // Do not boost by everything.
          )}
        )`;
      } else {
        throw new InvalidSearchRequestError(
          `the BOOST operator requires an array of two items.`
        );
      }
    } else {
      let searchTerm = this._parseAndValidateTerm(
        scopeName,
        searchCriteria,
        parentSearchTerm,
        mustReturnCtsQuery
      );
      if (searchTerm.hasModifiedCriteria()) {
        ctsQueryStr = this.generateQueryFromCriteria(
          scopeName,
          searchTerm.getModifiedCriteria(),
          parentSearchTerm,
          mustReturnCtsQuery,
          true // Unless logic in _parseAndValidateTerm changes, modified criteria will be an AND.
        );
      } else if (searchTerm.isUsable()) {
        const patternResponse = applyPattern({
          searchCriteriaProcessor: this,
          searchTerm,
          searchPatternOptions: this.searchPatternOptions,
          requestOptions: this.requestOptions,
        });

        if (utils.isNonEmptyString(patternResponse.codeStr)) {
          ctsQueryStr = patternResponse.codeStr;
        }

        // Unlike the CTS query that can be incorporated into a larger query, values are to be appended
        // to the values of any other search term in the same query.  This is not expected to be an issue
        // with its introductory purpose of supporting related lists that execute each relationship's
        // query individually.
        if (utils.isNonEmptyArray(patternResponse.values)) {
          this.values = this.values.concat(patternResponse.values);
        }

        // A single search term has the ability to exclude the type constraint.  Introduced for related lists..
        if (patternResponse.includeTypeConstraint === false) {
          this.includeTypeConstraint = false;
        }

        this.criteriaCnt++;
      } else {
        ctsQueryStr =
          returnTrueForUnusableTerms === true
            ? 'cts.trueQuery()'
            : 'cts.falseQuery()';
      }
    }
    return ctsQueryStr;
  }

  _parseAndValidateTerm(
    scopeName,
    searchCriteria,
    parentSearchTerm,
    mustReturnCtsQuery
  ) {
    let searchTerm = new SearchTerm()
      .addScopeName(scopeName)
      .addMustReturnCtsQuery(mustReturnCtsQuery) // unlikely this function needs or should change this value.
      .addParentSearchTerm(parentSearchTerm);
    for (const key of Object.keys(searchCriteria)) {
      // Ignore reserved property names.
      if (!['_scope', '_valueType'].includes(key)) {
        if (key.startsWith('_')) {
          searchTerm.setProperty(key.substring(1), searchCriteria[key]);
        } else if (!searchTerm.hasName()) {
          const termName = key;
          searchTerm.setName(termName);

          // Need to check for the property's existence as zero is a valid value.
          if (!searchCriteria.hasOwnProperty(termName)) {
            throw new InvalidSearchRequestError(
              `the '${termName}' term requires a value.`
            );
          }
        } else {
          throw new InvalidSearchRequestError(
            `search term defines more than one term name in criteria ${JSON.stringify(
              searchCriteria
            )}`
          );
        }
      }
    }
    if (!searchTerm.hasName()) {
      throw new InvalidSearchRequestError(
        `search term does not specify a term name in criteria ${JSON.stringify(
          searchCriteria
        )}`
      );
    }

    const termName = searchTerm.getName();
    let termValue = searchCriteria[termName];

    // If able to tokenize the value into multiple, create an AND and send back.
    if (utils.isString(termValue)) {
      const tokenizedValues = SearchCriteriaProcessor._tokenizeSearchTermValue(
        searchCriteria[termName],
        searchTerm.isCompleteMatch()
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
            // #273: Mark as a complete term to avoid tokenizing phrases when the
            // encapsulating AND gets processed.
            criterion._complete = true;
            return criterion;
          }),
        });
      }
      termValue = tokenizedValues[0];
    }
    searchTerm.setValue(termValue);

    const searchTermConfig = SearchCriteriaProcessor._getSearchTermConfig(
      scopeName,
      termName
    );
    searchTerm.setSearchTermConfig(searchTermConfig);

    // Determine the object type of the value, whether it is allowed by the pattern, and whether
    // we should make some adjustments.
    const patternName = searchTermConfig.getPatternName();
    if (typeof termValue == 'object') {
      // When the term value has the 'id' property and the term config specifies an ID index
      // reference, redefine the term to match on an ID value.
      if (
        SearchCriteriaProcessor._hasIdChildTerm(termValue) &&
        searchTermConfig.hasIdIndexReferences()
      ) {
        searchTerm = new SearchTerm()
          .addName(`${termName}Id`)
          .addValue(termValue.id)
          .addValueType(TYPE_ATOMIC)
          .addScopeName(scopeName)
          .addSearchTermConfig(
            new SearchTermConfig({
              indexReferences: searchTermConfig.getIdIndexReferences(),
              patternName: PATTERN_NAME_INDEXED_VALUE,
              scalarType: 'string',
            })
          );
      } else {
        if (SearchCriteriaProcessor._hasGroup(termValue)) {
          searchTerm.setValueType(TYPE_GROUP);
          if (!acceptsGroup(patternName)) {
            throw new InvalidSearchRequestError(
              `the '${termName}' term contains a group but is not allowed to.`
            );
          }
        } else if (
          SearchCriteriaProcessor.hasNonOptionPropertyName(termValue)
        ) {
          searchTerm.setValueType(TYPE_TERM);
          if (!acceptsTerm(patternName)) {
            throw new InvalidSearchRequestError(
              `the '${termName}' term contains another term but is not allowed to.`
            );
          }
        }

        // When the term value has the 'id' property and is configured to the hop inverse IRI pattern
        // pattern, change the 'id' property to 'iri'.
        if (
          SearchCriteriaProcessor._hasIdChildTerm(termValue) &&
          isConvertIdChildToIri(patternName)
        ) {
          termValue.iri = termValue.id;
          delete termValue.id;
        }

        // There are a couple contexts where we need to know a little about the child term.
        const targetScopeName = searchTermConfig.getTargetScopeName();
        searchTerm.addChildInfo(
          SearchCriteriaProcessor._getPartialChildSearchTermInfo(
            targetScopeName || scopeName,
            termValue
          )
        );

        // Always attempt to accept the target scope when specified by the search term.
        if (targetScopeName && targetScopeName != scopeName) {
          if (!isSearchScopeName(targetScopeName)) {
            throw new InternalServerError(
              `The '${termName}' search term is configured to an invalid target scope: '${targetScopeName}'`
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
        `the search term '${termName}' in scope '${scopeName}' only supports the 'id' child search term.`
      );
    } else if (!acceptsAtomicValue(patternName)) {
      throw new InvalidSearchRequestError(
        `the search term '${termName}' in scope '${scopeName}' does not accept atomic values.`
      );
    } else {
      searchTerm.setValueType(TYPE_ATOMIC);
    }

    // Ensure there is numeric weight
    if (!searchTerm.hasNumericWeight()) {
      searchTerm.setWeight(1.0);
    }

    SearchCriteriaProcessor._cleanTermValues(searchTerm);

    // Ignore punctuation-only terms and stop words
    if (
      /^[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]*$/.test(termValue) ||
      (typeof termValue == 'string' && STOP_WORDS.has(termValue.toLowerCase()))
    ) {
      searchTerm.setUsable(false);
      this.ignoredTerms.push(termValue);
    }

    return searchTerm;
  }

  static _getPartialChildSearchTermInfo(scopeName, termValue) {
    const hasGroup = SearchCriteriaProcessor._hasGroup(termValue);

    // May override when not a group.
    let willReturnCtsQuery = hasGroup;
    let valueType = TYPE_GROUP;
    let patternName = null;

    if (!hasGroup) {
      const termName =
        SearchCriteriaProcessor.getFirstNonOptionPropertyName(termValue);
      const searchTermConfig = SearchCriteriaProcessor._getSearchTermConfig(
        scopeName,
        termName
      );
      patternName = searchTermConfig.getPatternName();
      willReturnCtsQuery = returnsCtsQuery(patternName);
      valueType =
        utils.isArray(termValue[termName]) ||
        utils.isObject(termValue[termName])
          ? TYPE_TERM
          : TYPE_ATOMIC;
    }
    return {
      patternName,
      valueType,
      willReturnCtsQuery,
    };
  }

  // Get a search term's configuration by scope name and term name.  Exception thrown when an invalid combination.
  static _getSearchTermConfig(scopeName, termName) {
    const scopedTerms = SEARCH_TERMS_CONFIG[scopeName];
    if (!scopedTerms) {
      throw new InternalServerError(
        `No terms are configured to the '${scopeName}' search scope.`
      );
    } else if (!scopedTerms[termName]) {
      throw new InvalidSearchRequestError(
        `the '${termName}' term is invalid for the '${scopeName}' search scope. Valid choices: ${Object.keys(
          scopedTerms
        )
          .sort()
          .join(', ')}`
      );
    }
    return new SearchTermConfig(scopedTerms[termName]);
  }

  static _hasIdChildTerm(termValue) {
    return termValue.id && typeof termValue.id == 'string';
  }

  static getFirstNonOptionPropertyName(termValue) {
    let propName = null;
    if (termValue && typeof termValue == 'object') {
      const propNames = Object.keys(termValue);
      for (let i = 0; i < propNames.length; i++) {
        if (!propNames[i].startsWith('_')) {
          propName = propNames[i];
          break;
        }
      }
    }
    return propName;
  }

  static hasNonOptionPropertyName(termValue) {
    return (
      SearchCriteriaProcessor.getFirstNonOptionPropertyName(termValue) != null
    );
  }

  static _hasGroup(termValue) {
    return (
      termValue &&
      (termValue.AND || termValue.OR || termValue.NOT || termValue.BOOST)
    );
  }

  static _cleanTermValues(searchTerm) {
    if (SearchCriteriaProcessor._isKeywordTerm(searchTerm)) {
      // The return of this function could include cleaned up values.
      searchTerm.setValue(
        sanitizeAndValidateWildcardedStrings(searchTerm.getValue())
      );
    }
  }

  static _isKeywordTerm(searchTerm) {
    const searchTermConfig = searchTerm.getSearchTermConfig();
    return (
      TYPE_ATOMIC == searchTerm.getValueType() &&
      SEARCH_OPTIONS_NAME_KEYWORD ==
        resolveSearchOptionsName(
          searchTermConfig.getOptionsReference(),
          searchTermConfig.getPatternName()
        )
    );
  }

  static _requireSearchCriteriaObject(searchCriteria) {
    if (utils.isObject(searchCriteria)) {
      return true;
    }
    throw new InvalidSearchRequestError(
      `object expected but given ${JSON.stringify(searchCriteria)}`
    );
  }

  static _requireSearchCriteriaArray(searchCriteria) {
    if (utils.isArray(searchCriteria)) {
      return true;
    }
    throw new InvalidSearchRequestError(
      `array expected but given ${JSON.stringify(searchCriteria)}`
    );
  }

  // Accept search criteria formats:
  //
  //   1. JSON
  //   2. Stringified JSON
  //   3. Search string abiding by the LUX-supported subset of ML's search grammar.
  //
  static _requireSearchCriteriaJson(scopeName, searchCriteria) {
    // When search criteria is already an object, just make sure the scopeName parameter gets precedence.
    if (typeof searchCriteria == 'object') {
      if (scopeName) {
        searchCriteria._scope = scopeName;
      }
      return searchCriteria;
    }

    // When search criteria starts with an open curly brace, try to parse as JSON.
    if (typeof searchCriteria == 'string' && searchCriteria.startsWith('{')) {
      try {
        const searchCriteriaJson = JSON.parse(searchCriteria);
        // Give precedence to the search scope parameter.
        if (scopeName) {
          searchCriteriaJson._scope = scopeName;
        }
        return searchCriteriaJson;
      } catch (e) {
        // Allow to flow through
      }
    }

    return this.translateStringGrammarToJSON(scopeName, searchCriteria);
  }

  static _tokenizeSearchTermValue(value, isCompleteMatch) {
    // Do not tokenize or even trim when instructed to match on the full property value.
    if (isCompleteMatch) {
      return [value];
    }

    if (utils.isString(value)) {
      // Do not tokenize when (there isn't a space or) the value starts and ends with matching quote characters.
      value = value.trim();
      if (!value.includes(' ') || value.match(/^('|").+\1$/) != null) {
        return [value];
      }
      return utils.splitHonoringPhrases(value);
    }

    throw new InternalServerError(
      '_tokenizeSearchTermValue must be given a non-null string.'
    );
  }

  static translateStringGrammarToJSON(scopeName, searchCriteria) {
    if (!isSearchScopeName(scopeName)) {
      throw new InvalidSearchRequestError(
        `'${scopeName}' is not a valid search scope.`
      );
    }
    // Parse as ML's search grammar and convert to the LUX Search JSON format.  There are no bindings.
    const adjustedSearchCriteriaStr =
      SearchCriteriaProcessor._adjustSearchString(searchCriteria);
    let ctsQueryObj = null;
    try {
      ctsQueryObj = cts.parse(adjustedSearchCriteriaStr).toObject();
    } catch (e) {
      throw new InvalidSearchRequestError(
        `unable to parse criteria ${searchCriteria}`
      );
    }
    return {
      _scope: scopeName,
      ...SearchCriteriaProcessor._walkParsedQuery(ctsQueryObj),
    };
  }

  static _adjustSearchString(givenQueryString) {
    // Find all operators within the search string.  These are used later.
    const foundOperators = SEARCH_GRAMMAR_OPERATORS.filter((op) => {
      let re = new RegExp(`\\s${op}\\s`, 'i');
      return re.test(givenQueryString);
    });

    // Temporarily breakdown the given query, selectively modifying it before putting it back together.
    let adjustedSearchString = '';
    const bracketRegEx = new RegExp('\\[|\\]', 'g');
    // May be able to refactor to use utils.splitHonoringPhrases().
    givenQueryString.split('"').map((piece, i) => {
      // Even indexes are non-quoted strings that may include multiple terms, operators, etc.
      const isIndexEven = i % 2 == 0;
      if (isIndexEven) {
        // Until we start supporting term-level options, remove all unquoted brackets as users are pasting
        // strings with them and receiving an error reading "unexpected token".
        piece = piece.replace(bracketRegEx, ' ');

        // Uppercase the operators
        if (foundOperators.length > 0) {
          foundOperators.forEach((op) => {
            const re = new RegExp(`\\s${op}\\s`, 'ig');
            piece = piece.replace(re, ` ${op} `);
          });
        }

        // Until we support NEAR, lowercase NEAR to avoid search returning an error that it is not supported.
        piece = piece.replace(REG_EXP_NEAR_OPERATOR, '$1near$2');

        adjustedSearchString += piece;
      } else {
        // Odd pieces are quoted strings, which happens to be align with the requirement to not stem a *word* that is quoted.
        // Note that this is later ignored when the keyword search options do not apply, including all search tags configured
        // to the exact search option.
        const unstemmed = piece.match(' ') == null;
        adjustedSearchString += `"${piece}"${unstemmed ? '[unstemmed]' : ''}`;
      }
    });

    return adjustedSearchString;
  }

  static _walkParsedQuery(ctsQueryObj) {
    const searchCriteriaJson = {};
    for (const propName of Object.keys(ctsQueryObj)) {
      if (['andQuery', 'orQuery'].includes(propName)) {
        const operator = propName
          .substring(0, propName.length - 5)
          .toUpperCase();
        searchCriteriaJson[operator] = [];
        for (const item of ctsQueryObj[propName].queries) {
          searchCriteriaJson[operator].push(
            SearchCriteriaProcessor._walkParsedQuery(item)
          );
        }
      } else if (propName == 'notQuery') {
        searchCriteriaJson.NOT = [
          SearchCriteriaProcessor._walkParsedQuery(ctsQueryObj.notQuery.query),
        ];
      } else if (propName == 'boostQuery') {
        searchCriteriaJson.BOOST = [];
        searchCriteriaJson.BOOST.push(
          SearchCriteriaProcessor._walkParsedQuery(
            ctsQueryObj.boostQuery.matchingQuery
          )
        );
        searchCriteriaJson.BOOST.push(
          SearchCriteriaProcessor._walkParsedQuery(
            ctsQueryObj.boostQuery.boostingQuery
          )
        );
      } else if (propName == 'wordQuery') {
        // Restore phrase quotes (when there is a space in the value).
        searchCriteriaJson.text = ctsQueryObj.wordQuery.text[0];
        if (searchCriteriaJson.text.includes(' ')) {
          searchCriteriaJson.text = `"${searchCriteriaJson.text}"`;
        }
        for (const option of ctsQueryObj.wordQuery.options) {
          if (option == 'unstemmed') {
            searchCriteriaJson._stemmed = false;
          } else if (option.startsWith('lang=')) {
            searchCriteriaJson._lang = option.substring(5);
          } else {
            console.log(
              `Ignoring search term option '${option}' from cts.parse result.`
            );
          }
        }
      } else {
        // Better to ignore or bring back warnings?
        throw new InvalidSearchRequestError(
          `'${propName}' is not a supported portion of the search string grammar.`
        );
      }
    }
    return searchCriteriaJson;
  }

  // Examples input includes cts.*Query() and cts.*Values().  The point in using this is to ensure
  // search-related constants are defined.
  static evalQueryString(queryStr) {
    return fn.head(xdmp.eval(`${START_OF_GENERATED_QUERY}${queryStr}`));
  }
};

export { START_OF_GENERATED_QUERY, SearchCriteriaProcessor };
