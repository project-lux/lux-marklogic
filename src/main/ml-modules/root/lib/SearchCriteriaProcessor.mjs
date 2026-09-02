//#region Imports
import op from '/MarkLogic/optic.mjs';
import * as engine from '/lib/search/engine.mjs';
import {
  getChildId,
  getFirstNonOptionPropertyName,
  hasNonOptionPropertyName,
  sanitizeAndValidateWildcardedStrings,
} from '/lib/search/analyzeCriteria.mjs';
import { PatternOptions } from '/lib/search/PatternOptions.mjs';
import {
  SORT_TYPE_NON_SEMANTIC,
  SORT_TYPE_SEMANTIC,
} from '/lib/SortCriteria.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
} from '/lib/errorClasses.mjs';
import { SearchExecutionResult } from '/lib/search/SearchExecutionResult.mjs';
import * as utils from '/utils/utils.mjs';

import {
  adjustSearchString,
  translateStringGrammarToJSON,
  walkParsedQuery,
} from '/lib/search/stringGrammar.mjs';
import { isSearchScopeName } from '/lib/searchScope.mjs';
import { SortCriteria } from '/lib/SortCriteria.mjs';
import { getSearchTermConfig } from '/config/searchTermsConfig.mjs';
//#endregion

//#region Constants
const MAXIMUM_PAGE_LENGTH = 100;
const PREFER_FRAG_JOINS = false;

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
  #requestId;
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
    requestId = null,
    searchCriteria,
    scopeName = null,
    includeSearchResults = true,
    includeTypeConstraint = true, // TODO, PERF: doesn't do anything yet; does it need to?
    allowMultiScope = true,
    patternOptions = null,
    page = 1,
    pageLength = 20,
    pageWith = null,
    filterResults = false, // TODO, FUNC: doesn't do anything yet; does it need to?
    sortDelimitedStr = '',
    facetRequests = null,
  }) {
    this.#initProcessState({
      requestId,
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

    // Validate and cap pagination parameters before any work.
    utils.checkPaginationParameters(page, pageLength);
    this.#pageLength = Math.min(pageLength, MAXIMUM_PAGE_LENGTH);

    // Resolve/validate criteria JSON; scopeName param should take precedence
    this.#resolvedSearchCriteria =
      SearchCriteriaProcessor.requireSearchCriteriaJson(
        this.#scopeName,
        searchCriteria,
      );

    // Validate and finalize scope
    this.#resolveAndValidateScope();

    // Reject multi-scope searches when the caller has not opted in.
    if (this.#scopeName === 'multi' && !this.#allowMultiScope) {
      throw new InvalidSearchRequestError(
        "search scope of 'multi' not supported by this operation.",
      );
    }

    // Validate multi-scope criteria structure early (before execute).
    if (this.#scopeName === 'multi' && this.#allowMultiScope) {
      const sc = this.#resolvedSearchCriteria;
      if (!sc?.OR || !Array.isArray(sc.OR)) {
        throw new InvalidSearchRequestError(
          "a search with scope 'multi' must contain an 'OR' array.",
        );
      }
      if (sc.OR.length === 0) {
        throw new InvalidSearchRequestError(
          'more search criteria is required.',
        );
      }
    }

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

  getRequestId() {
    return this.#requestId;
  }

  getEstimate() {
    if (this.getSearchState() === 'completed') {
      return this.#searchExecutionResult.getTotal();
    }

    // Estimate-only path: avoid full result materialization when search
    // results are not requested. Uses cts.estimate (O(1) from indexes)
    // when the accumulator is join-free, otherwise falls through to plan
    // execution for the count.
    if (!this.#includeSearchResults) {
      this.#prepareForExecution();
      const { scopedCtsQuery, selectedPlan } = engine.buildPlans({
        scp: this,
        planCriteria: this.#resolvedSearchCriteria,
        planScope: this.#scopeName,
        allowMultiScope: this.#allowMultiScope,
        groups: engine.getResultRowGrouping(),
        sortCriteria: null,
        patternOptions: this.#patternOptions,
        includeSearchResults: true,
        pageWith: null,
      });
      const total = scopedCtsQuery
        ? Number(cts.estimate(scopedCtsQuery))
        : selectedPlan.groupBy(null, op.count('cnt')).result().toArray()[0].cnt;
      this.#searchExecutionResult = new SearchExecutionResult({
        searchResults: [],
        total,
        resultPage: -1,
        facetResponses: null,
      });
      this.#searchState = SEARCH_STATE_COMPLETED;
      return total;
    }

    // Legacy path: full execution when search results are included.
    const searchExecutionResult = this.execute();
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
    this.#patternOptions.setReturnValues(true);

    engine.traverseCriteria({
      scp: this,
      planCriteria: this.#resolvedSearchCriteria,
      planScope: this.#scopeName,
      allowMultiScope: this.#allowMultiScope,
      patternOptions: this.#patternOptions,
    });

    this.#searchState = SEARCH_STATE_COMPLETED;
    return this.#values;
  }

  // Builds Optic plans and determines execution strategy.
  // Returns { selectedPlan, sortedResultsPlan, unsortedResultsPlan,
  //           ctsExecutionEligible, ctsSearchOptions, scopedCtsQuery }.
  buildPlans(preferFragJoins = PREFER_FRAG_JOINS) {
    // May override the default set by prepare().
    this.#patternOptions.setPreferFragJoins(preferFragJoins);

    return engine.buildPlans({
      scp: this,
      planCriteria: this.#resolvedSearchCriteria,
      planScope: this.#scopeName,
      allowMultiScope: this.#allowMultiScope,
      groups: engine.getResultRowGrouping(),
      sortCriteria: this.#sortCriteria,
      patternOptions: this.#patternOptions,
      includeSearchResults: this.#includeSearchResults,
      pageWith: this.#pageWith,
      facetRequests: this.#facetRequests,
    });
  }

  // Delegates to engine.processNestedCriteria. Used by search pattern classes
  // to build sub-plans for nested criteria (hop patterns).
  //
  // parentScope: forwarded as-is to enable the empty-groups (same-scope
  // dataType-filter) optimization. Defaults to null (optimization disabled).
  // Current pattern callers (HopInverse, HopWithField) cross scope boundaries
  // via termConfig.getTargetScopeName() and so must leave it null; a future
  // same-scope caller can opt in by passing the parent's scope.
  processNestedCriteria({
    planCriteria,
    planScope = 'item',
    patternOptions,
    parentId,
    parentScope = null,
    allowMultiScope = false,
  }) {
    return engine.processNestedCriteria({
      scp: this,
      planCriteria,
      planScope,
      patternOptions,
      parentId,
      parentScope,
      allowMultiScope,
    });
  }

  // Like processNestedCriteria but returns a bare CTS query when the inner criteria
  // resolves entirely to CTS constraints. Returns null when an Optic plan is
  // required — caller should fall back to the join path.
  processNestedCriteriaAsCts({
    planCriteria,
    planScope,
    patternOptions,
    parentId,
  }) {
    return engine.processNestedCriteriaAsCts({
      scp: this,
      planCriteria,
      planScope,
      patternOptions,
      parentId,
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

  // Engine sets to null for facet-only requests.
  setSortCriteria(sortCriteria) {
    this.#sortCriteria = sortCriteria;
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
  static initializePatternOptions(patternOptions = null) {
    const opts = patternOptions ? patternOptions : new PatternOptions();
    opts.setPreferFragJoins(PREFER_FRAG_JOINS);
    return opts;
  }

  static sanitizeAndValidateWildcardedStrings(strOrArr) {
    return sanitizeAndValidateWildcardedStrings(strOrArr);
  }

  static getSortTypeFromSortBinding(sortBinding) {
    if (utils.isObject(sortBinding)) {
      return sortBinding.predicate != null
        ? SORT_TYPE_SEMANTIC
        : SORT_TYPE_NON_SEMANTIC;
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
    return getFirstNonOptionPropertyName(termValue);
  }

  static hasNonOptionPropertyName(termValue) {
    return hasNonOptionPropertyName(termValue);
  }

  // Pass-through method; canonical implementation in analyzeCriteria.getChildId.
  static getChildId(termValue) {
    return getChildId(termValue);
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
    requestId,
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
    this.#patternOptions =
      SearchCriteriaProcessor.initializePatternOptions(patternOptions);
    this.#page = page;
    this.#pageLength = pageLength;
    this.#pageWith = pageWith;
    this.#requestId = requestId;
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

export { SearchCriteriaProcessor };
