//#region Imports
import op from '/MarkLogic/optic.mjs';
import * as engine from './search/engine.mjs';
import {
  OPTION_NAME_PREFER_FRAG_JOINS,
  OPTION_NAME_RETURN_VALUES,
} from './search/patterns.mjs';
import { PatternOptions } from '/lib/search/PatternOptions.mjs';
import {
  SORT_TYPE_MULTI_SCOPE,
  SORT_TYPE_NON_SEMANTIC,
  SORT_TYPE_SEMANTIC,
} from './SortCriteria.mjs';
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
import {
  PLAN_FORMAT_JSON,
  PLAN_FORMAT_SOURCE,
} from './search/SearchExecutionResult.mjs';
//#endregion

//#region Constants
const PREFER_FRAG_JOINS = false;

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
  #allowMultiScope;
  #includeTypeConstraint;
  #includeSearchResults;
  #facetRequests;
  #filterResults;
  #page;
  #pageLength;
  #pageWith;
  #scopeName;
  #patternOptions;
  #resolvedSearchCriteria = null;
  #sortDelimitedStr;
  #sortCriteria;

  // Set during search and thus should be reset ahead of running execute() from
  // within #prepareForExecution().
  #searchState = SEARCH_STATE_NOT_REQUESTED;
  #searchExecutionResult;
  #criteriaCnt = 0;
  #ignoredTerms = [];
  #values = [];
  //#endregion

  //#region Constructor(s)
  constructor() {} // See prepare.
  //#endregion

  //#region Public instance methods
  /**
   * Resolves, validates, and stores search criteria and scope on the instance,
   * preparing it for getEstimate(), execute(), or executeForValues(). Mutates instance state.
   *
   * @param {Object|string} searchCriteria - Search criteria in the LUX string grammar or JSON grammar
   * @param {string} scopeName - Search scope name (e.g., 'agent', 'work', 'multi', 'concept')
   * @param {boolean} includeSearchResults - Whether to include search results in execution
   * @param {boolean} includeTypeConstraint - Whether to add dataType constraint to query
   * @param {boolean} allowMultiScope - Whether multi-scope searches are permitted
   * @param {PatternOptions} patternOptions - Configuration for search pattern behavior
   * @param {number} page - Page number for pagination (1-based)
   * @param {number} pageLength - Number of results per page
   * @param {string|null} pageWith - Optional document ID to find page containing this document
   * @param {boolean} filterResults - Whether to filter search results
   * @param {string} sortDelimitedStr - Parseable sort string; input to construct instance of SortCriteria
   * @param {Object|null} facetRequests - Facet requests to include in execution
   * @throws {InvalidSearchRequestError} When criteria invalid, scope invalid, or insufficient criteria
   * @throws {InternalServerError} When configuration issues detected
   */
  prepare({
    searchCriteria,
    scopeName = null,
    includeSearchResults = true,
    includeTypeConstraint = true,
    allowMultiScope = true,
    patternOptions = null,
    page = 1,
    pageLength = 20,
    pageWith = null,
    filterResults = false, // TODO: doesn't do anything yet; does it need to?
    sortDelimitedStr = '',
    facetRequests = null,
  }) {
    this.#initProcessState({
      scopeName,
      includeSearchResults,
      includeTypeConstraint,
      allowMultiScope,
      patternOptions,
      page,
      pageLength,
      pageWith,
      filterResults,
      sortDelimitedStr,
      facetRequests,
    });

    this.#patternOptions.set(OPTION_NAME_PREFER_FRAG_JOINS, PREFER_FRAG_JOINS);

    // Resolve/validate criteria JSON; scopeName param should take precedence
    this.#resolvedSearchCriteria =
      SearchCriteriaProcessor.requireSearchCriteriaJson(
        this.#scopeName,
        searchCriteria,
      );

    // Validate and finalize scope
    this.#resolveAndValidateScope();

    // Parse sort criteria now that we have the resolved search scope.
    this.#sortCriteria = new SortCriteria(
      this.#scopeName,
      this.#sortDelimitedStr,
    );

    return this; // supports chaining from prepare to execute
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

  getFilterResults() {
    return this.#filterResults;
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
      return this.#searchExecutionResult.getPlan(PLAN_FORMAT_SOURCE);
    }
    return `Search not completed - current state: ${this.getSearchState()}`;
  }

  getQueryJson() {
    if (this.getSearchState() === 'completed') {
      return this.#searchExecutionResult.getPlan(PLAN_FORMAT_JSON);
    }
    return {
      message: 'Search not completed',
      currentState: this.getSearchState(),
    };
  }

  getEstimate() {
    const searchExecutionResult =
      this.getSearchState() === 'completed'
        ? this.#searchExecutionResult
        : this.execute();
    return searchExecutionResult.getTotal();
  }

  // Returns an instance of SearchExecutionResult containing search results and/or facets.
  execute() {
    this.#prepareForExecution();

    this.#searchExecutionResult = engine.performSearch(this);

    this.#searchState = SEARCH_STATE_COMPLETED;
    return this.#searchExecutionResult;
  }

  // Runs criteria processing to trigger pattern-level value population (via
  // appendValues) without executing the expensive Optic plan. Used by related
  // list values-only searches where HopInverse populates values directly.
  executeForValues() {
    this.#prepareForExecution(); // does not accummulate values across multiple calls
    this.#patternOptions.set(OPTION_NAME_RETURN_VALUES, true);

    this.processCriteria({
      planCriteria: this.#resolvedSearchCriteria,
      planScope: this.#scopeName,
      allowMultiScope: this.#allowMultiScope,
      patternOptions: this.#patternOptions,
    });

    this.#searchState = SEARCH_STATE_COMPLETED;
    return this.#values;
  }

  // Builds sorted and unsorted Optic plans without executing them.
  // Returns { sortedResultsPlan, unsortedResultsPlan }.
  buildPlans(preferFragJoins = PREFER_FRAG_JOINS) {
    // May override the default set by prepare().
    this.#patternOptions.set(OPTION_NAME_PREFER_FRAG_JOINS, preferFragJoins);

    return engine.buildPlans({
      scp: this,
      planCriteria: this.#resolvedSearchCriteria,
      planScope: this.#scopeName,
      allowMultiScope: this.#allowMultiScope,
      groups: engine.getResultRowGrouping(),
      sortCriteria: this.#sortCriteria,
      patternOptions: this.#patternOptions,
    });
  }

  // Delegates to engine.processCriteria. Used by executeForValues() and by
  // search pattern classes to process nested criteria.
  processCriteria({
    planCriteria,
    planScope = 'item',
    patternOptions,
    groups = null,
    parentId = null,
    allowMultiScope = false,
  }) {
    return engine.processCriteria({
      scp: this,
      planCriteria,
      planScope,
      patternOptions,
      groups,
      parentId,
      allowMultiScope,
    });
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

  getSortCriteria() {
    return this.#sortCriteria;
  }

  isAllowMultiScope() {
    return this.#allowMultiScope;
  }

  getIncludeSearchResults() {
    return this.#includeSearchResults;
  }

  getFacetRequests() {
    return this.#facetRequests;
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

  static getChildId(termValue) {
    const value = termValue?.id ?? termValue?.iri ?? null;
    return typeof value === 'string' ? value : null;
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
    includeSearchResults,
    includeTypeConstraint,
    allowMultiScope,
    patternOptions,
    page,
    pageLength,
    pageWith,
    filterResults,
    sortDelimitedStr,
    facetRequests,
  }) {
    this.#scopeName = scopeName;
    this.#includeSearchResults = includeSearchResults;
    this.#includeTypeConstraint = includeTypeConstraint;
    this.#allowMultiScope = allowMultiScope;
    this.#patternOptions = patternOptions
      ? patternOptions
      : new PatternOptions();
    this.#page = page;
    this.#pageLength = pageLength;
    this.#pageWith = pageWith;
    this.#sortDelimitedStr = sortDelimitedStr;
    this.#facetRequests = facetRequests;
    this.#filterResults = filterResults;
  }

  /**
   * Resolves the scope from criteria, validates it, and stores it on the instance.
   * Extracts scope from resolvedSearchCriteria._scope, normalizes it (trim + lowercase),
   * validates it's a recognized scope name, then sets this.scopeName.
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
        return;
      }
      throw new InvalidSearchRequestError(
        `'${sc._scope}' is not a valid search scope.`,
      );
    }
    throw new InvalidSearchRequestError(`search scope not specified.`);
  }

  #prepareForExecution() {
    this.#searchState = SEARCH_STATE_REQUESTED;
    this.#searchExecutionResult = null;
    this.#criteriaCnt = 0;
    this.#ignoredTerms = [];
    this.#values = [];
  }
  //#endregion
};

export { COMPARATORS, SearchCriteriaProcessor };
