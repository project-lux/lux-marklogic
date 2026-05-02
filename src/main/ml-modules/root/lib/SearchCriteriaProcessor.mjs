//#region Imports
import op from '/MarkLogic/optic.mjs';
import * as engine from './search/engine.mjs';
import { PatternOptions } from './search/patterns.mjs';
import {
  SORT_TYPE_MULTI_SCOPE,
  SORT_TYPE_NON_SEMANTIC,
  SORT_TYPE_SEMANTIC,
} from './SortCriteria.mjs';
import { getSearchTermsConfig } from '../config/searchTermsConfig.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
} from './errorClasses.mjs';
import * as utils from '../utils/utils.mjs';

import {
  adjustSearchString,
  translateStringGrammarToJSON,
  walkParsedQuery,
} from './search/stringGrammar.mjs';
import { isSearchScopeName } from './searchScope.mjs';
import { SortCriteria } from './SortCriteria.mjs';
//#endregion

//#region Constants
const sem = require('/MarkLogic/semantics.xqy');

const PREFIX_MAPPINGS = {
  crm: 'http://www.cidoc-crm.org/cidoc-crm/',
  la: 'https://linked.art/ns/terms/',
  lux: 'https://lux.collections.yale.edu/ns/',
  skos: 'http://www.w3.org/2004/02/skos/core#',
};

// TODO: delete once able to.
const START_OF_GENERATED_QUERY = `
const op = require("/MarkLogic/optic");
const crm = op.prefixer("http://www.cidoc-crm.org/cidoc-crm/");
const la = op.prefixer("https://linked.art/ns/terms/");
const lux = op.prefixer("https://lux.collections.yale.edu/ns/");
const skos = op.prefixer("http://www.w3.org/2004/02/skos/core#");`;

// Optic comparison operators
const COMPARATORS = {
  '=': op.eq,
  '!=': op.ne,
  '<': op.lt,
  '>': op.gt,
  '<=': op.le,
  '>=': op.ge,
};

const SEARCH_STATE_NOT_REQUESTED = 'not requested';
const SEARCH_STATE_REQUESTED = 'requested';
const SEARCH_STATE_COMPLETED = 'completed';
//#endregion

const SearchCriteriaProcessor = class {
  //#region Private fields
  #searchState = SEARCH_STATE_NOT_REQUESTED;
  #allowMultiScope;
  #criteriaCnt = 0;
  #ignoredTerms = [];
  #includeTypeConstraint;
  #page;
  #pageLength;
  #pageWith;
  #requestOptions;
  #resolvedSearchCriteria = null;
  #scopeName;
  #patternOptions;
  #searchResults;
  #searchTermsConfig;
  #sortCriteria;
  #values = [];
  #valuesOnly = false;
  //#endregion

  //#region Constructor(s)
  constructor(filterResults) {
    // Capture all constructor parameters as request options, enabling search patterns to utilize.
    this.#requestOptions = { filterResults };

    // Once per instance, which technically presumes this shouldn't change when reused.
    this.#searchTermsConfig = getSearchTermsConfig();
  }
  //#endregion

  //#region Public instance methods
  /**
   * Processes and validates search criteria, building a fully resolved CTS query string.
   * This is the main entry point that orchestrates the entire search criteria processing
   * pipeline from raw input to executable query. Mutates instance state with results.
   *
   * @param {Object|string} searchCriteria - Search criteria in the LUX string grammar or JSON grammar
   * @param {string} scopeName - Search scope name (e.g., 'agent', 'work', 'multi', 'concept')
   * @param {boolean} allowMultiScope - Whether multi-scope searches are permitted
   * @param {PatternOptions} patternOptions - Configuration for search pattern behavior
   * @param {boolean} includeTypeConstraint - Whether to add dataType constraint to query
   * @param {number} page - Page number for pagination (1-based)
   * @param {number} pageLength - Number of results per page
   * @param {string|null} pageWith - Optional document ID to find page containing this document
   * @param {SortCriteria|Object|string} sortCriteria - Sort configuration or parseable sort string
   * @param {boolean} valuesOnly - Whether patterns should return values instead of queries
   * @throws {InvalidSearchRequestError} When criteria invalid, scope invalid, or insufficient criteria
   * @throws {InternalServerError} When configuration issues detected
   */
  prepare(
    searchCriteria,
    scopeName,
    allowMultiScope,
    patternOptions,
    includeTypeConstraint,
    page,
    pageLength,
    pageWith,
    sortCriteria,
    valuesOnly,
  ) {
    this.#initProcessState({
      scopeName,
      allowMultiScope,
      patternOptions,
      includeTypeConstraint,
      page,
      pageLength,
      pageWith,
      sortCriteria,
      valuesOnly,
    });

    // Resolve/validate criteria JSON; scopeName param should take precedence
    this.#resolvedSearchCriteria =
      SearchCriteriaProcessor.requireSearchCriteriaJson(
        this.#scopeName,
        searchCriteria,
      );

    // Validate and finalize scope into this + requestOptions
    this.#resolveAndValidateScope();
  }

  getSearchCriteria() {
    return this.#resolvedSearchCriteria;
  }

  hasSearchScope() {
    return utils.isNonEmptyString(this.#scopeName);
  }

  getSearchScope() {
    return this.#scopeName;
  }

  getRequestOptions() {
    return this.#requestOptions;
  }

  addIgnoredTerm(term) {
    this.#ignoredTerms.push(term);
  }

  getIgnoredTerms() {
    return this.#ignoredTerms;
  }

  getPage() {
    return this.#page;
  }

  getPageLength() {
    return this.#pageLength;
  }

  getPageWith() {
    return this.#pageWith;
  }

  getSearchState() {
    return this.#searchState;
  }

  getQueryStr() {
    if (this.getSearchState() === 'completed') {
      return this.#searchResults.planAsSource;
    }
    return `Search not completed - current state: ${this.getSearchState()}`;
  }

  getQueryJson() {
    if (this.getSearchState() === 'completed') {
      return this.#searchResults.planAsJson;
    }
    return {
      message: 'Search not completed',
      currentState: this.getSearchState(),
    };
  }

  getDebugMessages() {
    if (this.getSearchState() === 'completed') {
      return this.#searchResults.debug;
    }
    return [`Search not completed - current state: ${this.getSearchState()}`];
  }

  getEstimate() {
    return this.getSearchResults().results.length;
  }

  // returns {
  //   results: Array<object> | null,
  //   planAsJson: object,
  //   planAsSource: string,
  //   debug: Array<string>,
  // }
  getSearchResults() {
    if (this.#searchResults) {
      return this.#searchResults;
    }
    this.#searchState = SEARCH_STATE_REQUESTED;
    this.#searchResults = engine.performSearch({
      searchCriteriaProcessor: this,
      searchCriteria: this.#resolvedSearchCriteria,
      searchScope: this.#scopeName,
      requestOptions: this.#requestOptions,
      allowMultiScope: this.#allowMultiScope,
      includeResults: true,
    });
    this.#searchState = SEARCH_STATE_COMPLETED;
    return this.#searchResults;
  }

  // Wrapper function enabling search patterns to process nested criteria.
  processCriteria({
    planCriteria,
    planScope = 'item',
    patternOptions,
    groups = null,
    parentId = null,
    allowMultiScope = false,
    requestOptions = null,
  }) {
    return engine.processCriteria({
      searchCriteriaProcessor: this,
      planCriteria,
      planScope,
      patternOptions,
      groups,
      parentId,
      allowMultiScope,
      requestOptions,
    });
  }

  // Certain search patterns implement an option compelling them to return values versus a CTS query.
  // This was introduced in support of related lists.
  isValuesOnly() {
    return this.#valuesOnly;
  }

  appendValues(arr) {
    this.#values = this.#values.concat(arr);
  }

  getValues() {
    return this.#values;
  }

  getPatternOptions() {
    return this.#patternOptions;
  }

  getSearchTermsConfig() {
    return this.#searchTermsConfig;
  }

  setIsTypeConstraintEnabled(enabled) {
    this.#includeTypeConstraint = enabled;
  }

  isTypeConstraintEnabled() {
    return this.#includeTypeConstraint;
  }

  incrementCriteriaCount() {
    this.#criteriaCnt++;
  }

  getCriteriaCount() {
    return this.#criteriaCnt;
  }
  //#endregion

  //#region Public static methods
  static getPrefixesForSPARQL() {
    return Object.entries(PREFIX_MAPPINGS)
      .map(([prefix, uri]) => `PREFIX ${prefix}: <${uri}>`)
      .join('\n');
  }

  static expandPredicates(predicates) {
    return predicates.map((predicate) =>
      sem.curieExpand(predicate, PREFIX_MAPPINGS),
    );
  }

  static formatPredicatesForSPARQL(predicates, transitive = true) {
    const individuals = transitive
      ? predicates.map((predicate) => {
          // TODO: optimization idea = omit + when single criterion as group by nullifies need.
          return predicate.concat('+');
        })
      : predicates;
    return `(${individuals.join(' | ')})`;
  }

  static getSortType(isMultiScope, isSemantic) {
    let sortType = SORT_TYPE_NON_SEMANTIC;
    if (isMultiScope) sortType = SORT_TYPE_MULTI_SCOPE;
    else if (isSemantic) sortType = SORT_TYPE_SEMANTIC;
    return sortType;
  }

  static getSortTypeFromSortBinding(sortBinding) {
    if (utils.isObject(sortBinding)) {
      const isMultiScope = sortBinding.subSorts != null;
      const isSemantic = sortBinding.predicate != null;
      return SearchCriteriaProcessor.getSortType(isMultiScope, isSemantic);
    }
    throw new InternalServerError(
      'sortBinding is required to determine sort type.',
    );
  }

  static getSortTypeFromSortCriteria(sortCriteria) {
    return SearchCriteriaProcessor.getSortType(
      sortCriteria.hasMultiScopeSortOption(),
      sortCriteria.hasSemanticSortOption(),
    );
  }

  static evalQueryString(queryStr) {
    // TODO: will the Optic version still need this? Would prefer to avoid eval or add protection.
    return fn.head(
      xdmp.eval(
        `${START_OF_GENERATED_QUERY}; const q = ${queryStr}; q; export default q`,
      ),
    );
  }

  // Pass-through method for backward compatibility
  static translateStringGrammarToJSON(scopeName, searchCriteria) {
    return translateStringGrammarToJSON(scopeName, searchCriteria);
  }

  // Pass-through method in support of unit testing.
  static adjustSearchString(givenQueryString) {
    return adjustSearchString(givenQueryString);
  }

  // Pass-through method in support of unit testing.
  static walkParsedQuery(ctsQueryObj) {
    return walkParsedQuery(ctsQueryObj);
  }

  static getFirstNonOptionPropertyName(termValue) {
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

  static hasNonOptionPropertyName(termValue) {
    return (
      SearchCriteriaProcessor.getFirstNonOptionPropertyName(termValue) != null
    );
  }

  static requireSearchCriteriaObject(searchCriteria) {
    if (utils.isObject(searchCriteria)) return true;
    throw new InvalidSearchRequestError(
      `object expected but given ${JSON.stringify(searchCriteria)}`,
    );
  }

  static requireSearchCriteriaArray(searchCriteria) {
    if (utils.isArray(searchCriteria)) return true;
    throw new InvalidSearchRequestError(
      `array expected but given ${JSON.stringify(searchCriteria)}`,
    );
  }

  static requireSearchCriteriaJson(scopeName, searchCriteria) {
    if (utils.isUndefined(searchCriteria)) {
      throw new InvalidSearchRequestError(`Search criteria is required.`);
    }

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

    return translateStringGrammarToJSON(scopeName, searchCriteria);
  }
  //#endregion

  //#region Private instance methods
  #initProcessState({
    scopeName,
    allowMultiScope,
    patternOptions,
    includeTypeConstraint,
    page,
    pageLength,
    pageWith,
    sortCriteria,
    valuesOnly,
  }) {
    this.#scopeName = scopeName;
    this.#allowMultiScope = allowMultiScope;
    this.#page = page;
    this.#pageLength = pageLength;
    this.#pageWith = pageWith;
    this.#sortCriteria =
      sortCriteria instanceof SortCriteria
        ? sortCriteria
        : new SortCriteria(sortCriteria || '');
    this.#valuesOnly = valuesOnly;

    this.#patternOptions = patternOptions
      ? patternOptions
      : new PatternOptions();

    this.#includeTypeConstraint = includeTypeConstraint;

    // reset per-invocation fields
    this.#searchState = SEARCH_STATE_NOT_REQUESTED;
    this.#criteriaCnt = 0;
    this.#ignoredTerms = [];
    this.#searchResults = null;
    this.#values = [];
  }

  /**
   * Resolves the scope from criteria, validates it, and applies it to instance and requestOptions.
   * Extracts scope from resolvedSearchCriteria._scope, normalizes it (trim + lowercase),
   * validates it's a recognized scope name, then sets this.scopeName and requestOptions.scopeName.
   * Removes the _scope property from criteria after processing.
   *
   * @throws {InvalidSearchRequestError} When scope is invalid or not specified
   */
  #resolveAndValidateScope() {
    const sc = this.#resolvedSearchCriteria;
    if (sc && utils.isNonEmptyString(sc._scope)) {
      const normalized = sc._scope.trim().toLowerCase();
      if (isSearchScopeName(normalized)) {
        this.#scopeName = normalized;
        delete sc._scope;
        this.#requestOptions.scopeName = normalized; // some patterns need this
        return;
      }
      throw new InvalidSearchRequestError(
        `'${sc._scope}' is not a valid search scope.`,
      );
    }
    throw new InvalidSearchRequestError(`search scope not specified.`);
  }
  //#endregion
};

export { COMPARATORS, START_OF_GENERATED_QUERY, SearchCriteriaProcessor };
