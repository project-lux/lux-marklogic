//#region Imports
import op from '/MarkLogic/optic';
import {
  SORT_TYPE_MULTI_SCOPE,
  SORT_TYPE_NON_SEMANTIC,
  SORT_TYPE_SEMANTIC,
} from './SortCriteria.mjs';
import { SEMANTIC_SORT_TIMEOUT } from './appConstants.mjs';
import { getSearchTermsConfig } from '../config/searchTermsConfig.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
} from './errorClasses.mjs';
import { TOKEN_FIELDS, TOKEN_PREDICATES, TOKEN_TYPES } from './searchLib.mjs';
import * as utils from '../utils/utils.mjs';

import { generateQueryFromCriteria } from './search-criteria/criteriaEngine.mjs';
import {
  adjustSearchString,
  translateStringGrammarToJSON,
  walkParsedQuery,
} from './search-criteria/stringGrammar.mjs';
import {
  getSearchScopeFields,
  getSearchScopePredicates,
  getSearchScopeTypes,
} from './searchScope.mjs';
import { isSearchScopeName } from './searchScope.mjs';
import { SearchPatternOptions } from './SearchPatternOptions.mjs';
import { SortCriteria } from './SortCriteria.mjs';
//#endregion

//#region Constants
// TODO: Now that we're ML 12, can and should we set this to none?  Unless made conditional,
// doing so could be the first non-ML11 compatible change.
const FROM_SEARCH_OPTIONS = { scoreMethod: 'simple' };

const START_OF_GENERATED_QUERY = `
const op = require("/MarkLogic/optic");
const crm = op.prefixer("http://www.cidoc-crm.org/cidoc-crm/");
const la = op.prefixer("https://linked.art/ns/terms/");
const lux = op.prefixer("https://lux.collections.yale.edu/ns/");
const skos = op.prefixer("http://www.w3.org/2004/02/skos/core#");`;

const MAXIMUM_PAGE_WITH_LENGTH = 100000;
//#endregion

const SearchCriteriaProcessor = class {
  //#region Private fields
  #allowMultiScope;
  #criteriaCnt = 0;
  #ctsQueryStr = '';
  #ctsQueryStrWithTokens = '';
  #ignoredTerms = [];
  #includeTypeConstraint;
  #page;
  #pageLength;
  #pageWith;
  #requestOptions;
  #resolvedSearchCriteria = null;
  #scopeName;
  #searchPatternOptions;
  #searchTermsConfig;
  #sortCriteria;
  #values = [];
  #valuesOnly = false;
  //#endregion

  //#region Constructor(s)
  constructor(filterResults, facetsAreLikely, synonymsEnabled) {
    // Capture all constructor parameters as request options, enabling search patterns to utilize.
    this.#requestOptions = { filterResults, facetsAreLikely, synonymsEnabled };

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
   * @param {SearchPatternOptions} searchPatternOptions - Configuration for search pattern behavior
   * @param {boolean} includeTypeConstraint - Whether to add dataType constraint to query
   * @param {number} page - Page number for pagination (1-based)
   * @param {number} pageLength - Number of results per page
   * @param {string|null} pageWith - Optional document ID to find page containing this document
   * @param {SortCriteria|Object|string} sortCriteria - Sort configuration or parseable sort string
   * @param {boolean} valuesOnly - Whether patterns should return values instead of queries
   * @throws {InvalidSearchRequestError} When criteria invalid, scope invalid, or insufficient criteria
   * @throws {InternalServerError} When configuration issues detected
   */
  process(
    searchCriteria,
    scopeName,
    allowMultiScope,
    searchPatternOptions,
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
      searchPatternOptions,
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

    // Early branch for multi-scope (unchanged behavior)
    if (this.#scopeName === 'multi') {
      this.#buildMultiScopeQueryOrRecurse();
      // Return if we have a query, else allow to flow through to empty criteria check.
      if (utils.isNonEmptyString(this.#ctsQueryStr)) {
        return;
      }
    } else {
      // Build CTS query template (string)
      this.#ctsQueryStrWithTokens = this.generateQueryFromCriteria(
        this.#scopeName,
        this.#resolvedSearchCriteria,
        null,
        true, // Must return a CTS query.
        false, // Return cts.falseQuery when the top-level term is unusable.
      );
    }

    this.#requireCriteria();

    // Conditionally add type constraint, using a token for search scope-specific estimates.
    if (this.#includeTypeConstraint) {
      this.#ctsQueryStrWithTokens = `cts.andQuery([
        cts.jsonPropertyValueQuery('dataType', ${TOKEN_TYPES}, ['exact']),
        ${this.#ctsQueryStrWithTokens}
      ])`;
    }

    // Resolve tokens to final query with default field, predicate and type values
    this.#ctsQueryStr = this.resolveTokens(
      getSearchScopeFields(this.#scopeName, true), // default to all
      getSearchScopePredicates(this.#scopeName), // defaults to any
      getSearchScopeTypes(this.#scopeName, false), // default to none
    );
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

  // Get query. If you're looking for the query with different token values, use resolveTokens.
  getCtsQueryStr() {
    // Finalize the query
    this.#ctsQueryStr =
      this.#ctsQueryStr && this.#ctsQueryStr.length > 0
        ? this.#ctsQueryStr
        : cts.parse('');
    return this.#ctsQueryStr;
  }

  getEstimate() {
    return cts.estimate(
      SearchCriteriaProcessor.evalQueryString(this.getCtsQueryStr()),
    );
  }

  // returns { resultPage: number, results: Array<{id: string, type: string}> }
  getSearchResults() {
    const sortType = SearchCriteriaProcessor.getSortTypeFromSortCriteria(
      this.#sortCriteria,
    );
    // TODO: these are the three to consolidate in the Optic version.
    if (SORT_TYPE_MULTI_SCOPE === sortType) {
      return this.#getMultiScopeSortResults();
    } else if (SORT_TYPE_SEMANTIC === sortType) {
      return this.#getSemanticSortResults();
    } else {
      return this.#getNonSemanticSortResults();
    }
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

  getSearchPatternOptions() {
    return this.#searchPatternOptions;
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

  incrementCriteriaCnt() {
    this.#criteriaCnt++;
  }

  getCriteriaCount() {
    return this.#criteriaCnt;
  }

  addIgnoredTerm(v) {
    this.#ignoredTerms.push(v);
  }

  // Pass-through method
  generateQueryFromCriteria(
    scopeName,
    searchCriteria,
    parentSearchTerm = null,
    mustReturnCtsQuery = false,
    returnTrueForUnusableTerms = true,
  ) {
    return generateQueryFromCriteria(this, {
      scopeName,
      searchCriteria,
      parentSearchTerm,
      mustReturnCtsQuery,
      returnTrueForUnusableTerms,
    });
  }

  /**
   * Public: resolve tokens within query string. This assists in the support of providing estimates for additional search scopes.
   *
   * @param {Array} fieldsArr - Array of field names to apply within the returned query string.
   * @param {Array} predicatesArr - Array of predicates to apply within the returned query string.
   * @param {Array} typesArr - Array of types to apply within the returned query string.
   * @returns {String} Query string after applying parameter values.
   */
  resolveTokens(fieldsArr, predicatesArr, typesArr) {
    const tokens = [
      { pattern: TOKEN_FIELDS, value: fieldsArr, scalarType: 'string' },
      { pattern: TOKEN_PREDICATES, value: predicatesArr, scalarType: 'code' },
      { pattern: TOKEN_TYPES, value: typesArr, scalarType: 'string' },
    ];

    // Replace tokens within the query string template
    let out = this.#ctsQueryStrWithTokens;
    tokens.forEach((t) => {
      const val = Array.isArray(t.value)
        ? utils.arrayToString(t.value, t.scalarType)
        : t.value;
      const re = new RegExp(t.pattern, 'g');
      if (utils.isNonEmptyString(out)) out = out.replace(re, val);
    });
    return out;
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
    searchPatternOptions,
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

    this.#searchPatternOptions = searchPatternOptions
      ? searchPatternOptions
      : new SearchPatternOptions();

    this.#includeTypeConstraint = includeTypeConstraint;

    // reset per-invocation fields
    this.#criteriaCnt = 0;
    this.#ignoredTerms = [];
    this.#ctsQueryStrWithTokens = '';
    this.#ctsQueryStr = '';
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

  // returns { resultPage: number, results: Array<{id: string, type: string}> }
  #getMultiScopeSortResults() {
    const ctsQuery = SearchCriteriaProcessor.evalQueryString(
      this.getCtsQueryStr(),
    );
    const docPlan = op.fromSearch(
      ctsQuery,
      ['fragmentId'],
      null,
      FROM_SEARCH_OPTIONS,
    );
    const { order, subSortConfigs } =
      this.#sortCriteria.getMultiScopeSortOption();
    const subSortPlans = subSortConfigs.map((cfg) => this.#getSubSortPlan(cfg));
    const unionSubSortPlan = subSortPlans.reduce(
      (acc, p) => (acc === null ? p : acc.union(p)),
      null,
    );
    const finalPlan = docPlan
      .joinLeftOuter(unionSubSortPlan, op.on('fragmentId', 'fragmentId'))
      .joinDocUri(op.col('uri'), op.fragmentIdCol('fragmentId'));
    return this.#pageWith
      ? this.#getOpticPageWithResults(finalPlan, order)
      : this.#getOpticPaginatedResults(finalPlan, order);
  }

  #getSubSortPlan(subSortConfig) {
    return this.#getFieldReferencePlan(subSortConfig);
  }

  #getFieldReferencePlan(subSortConfig) {
    return op.fromLexicons(
      { sortByMe: cts.fieldReference(subSortConfig.indexReference) },
      null,
      op.fragmentIdCol('fragmentId'),
    );
  }

  // returns { resultPage: number, results: Array<{id: string, type: string}> }
  #getSemanticSortResults() {
    xdmp.setRequestTimeLimit(SEMANTIC_SORT_TIMEOUT);

    // This variable determines if each search result should be represented once yet has more than one triple with sortPredicate
    // (e.g., co-produced items) or multiple names to sort on (e.g., sort names in multiple languages).
    // For now, this defaults to true. Feel free to parameterize if desired.
    const oneSortValuePerResult = true;

    const { predicate, indexReference, order } =
      this.#sortCriteria.getSemanticSortOption();
    const ctsQuery = SearchCriteriaProcessor.evalQueryString(
      this.getCtsQueryStr(),
    );
    // get cts results into an optic plan.
    // add a column for the document uri for each result, which we will use later
    const ctsPlan = op
      .fromSearch(ctsQuery)
      .joinDocUri('uri', op.fragmentIdCol('fragmentId'));

    // create a plan from all of the triples linked to our predicate
    // make sure we get a fragmentId for each triple
    const triplePlan = op.fromTriples(
      op.pattern(
        op.col('subjectIri'),
        predicate,
        op.col('objectIri'),
        op.fragmentIdCol('fragmentId'),
      ),
    );

    // join the triples to the cts results where they have matching fragmentId
    let semanticSortPlan = ctsPlan.joinLeftOuter(triplePlan);

    // create a plan where each row has the following -
    // - fieldDocIri: iri of a document
    // - sortByMe: indexed value from that document, which we will use for sorting
    const indexedFieldPlan = op.fromLexicons({
      fieldDocIri: cts.iriReference(),
      sortByMe: cts.fieldReference(indexReference),
    });

    // Add the sortByMe values to the rows, where the index's fieldDocIri matches the triple's objectIri
    semanticSortPlan = semanticSortPlan.joinLeftOuter(
      indexedFieldPlan,
      op.on('objectIri', 'fieldDocIri'),
    );

    // The following is necessary when one wants each search result represented once yet has more than one triple with sortPredicate
    // (e.g., co-produced items) or multiple names to sort on (e.g., sort names in multiple languages).
    if (oneSortValuePerResult === true) {
      // When a search value has multiple values to sort by, they prevail in the following order:
      // - for multiple triples: whichever objectIri has comes first in ascending string order
      // - for multiple indexed names: whichever sortByMe comes first in ascending string order
      semanticSortPlan = semanticSortPlan.groupBy(
        ['uri'],
        [
          order === 'ascending'
            ? op.min('sortByMe', op.col('sortByMe'))
            : op.max('sortByMe', op.col('sortByMe')),
        ],
      );
    }

    return this.#pageWith
      ? this.#getOpticPageWithResults(semanticSortPlan, order)
      : this.#getOpticPaginatedResults(semanticSortPlan, order);
  }

  #getOpticPaginatedResults(opticPlan, order) {
    const results = opticPlan
      .orderBy(
        order === 'ascending'
          ? op.asc(op.col('sortByMe'))
          : op.desc(op.col('sortByMe')),
      )
      .offset((this.#page - 1) * this.#pageLength)
      .limit(this.#pageLength)
      .result()
      .toArray()
      .map(({ uri }) => ({ id: uri, type: cts.doc(uri).xpath('/json/type') }));
    return { resultPage: this.#page, results };
  }

  #getOpticPageWithResults(opticPlan, order) {
    const uriToFind = this.#pageWith;
    const planOutput = opticPlan
      .orderBy(
        order === 'ascending'
          ? op.asc(op.col('sortByMe'))
          : op.desc(op.col('sortByMe')),
      )
      .limit(MAXIMUM_PAGE_WITH_LENGTH + 1)
      .result()
      .toArray();

    if (planOutput.length > MAXIMUM_PAGE_WITH_LENGTH) {
      console.warn(
        `The search exceeded the ${MAXIMUM_PAGE_WITH_LENGTH} limit with base search criteria ${JSON.stringify(this.getSearchCriteria())}`,
      );
    }

    const foundUriIndex = planOutput.findIndex(({ uri }) => uri === uriToFind);
    if (foundUriIndex === -1) {
      throw new InvalidSearchRequestError(
        `The document ID specified by pageWith (${this.#pageWith}) could not be found in the first ${MAXIMUM_PAGE_WITH_LENGTH} search results`,
      );
    }
    const foundUriPage = Math.ceil((foundUriIndex + 1) / this.#pageLength);
    const results = planOutput
      .slice(
        (foundUriPage - 1) * this.#pageLength,
        foundUriPage * this.#pageLength,
      )
      .map(({ uri }) => ({ id: uri, type: cts.doc(uri).xpath('/json/type') }));
    return { resultPage: foundUriPage, results };
  }

  // returns { resultPage: number, results: Array<{id: string, type: string}> }
  #getNonSemanticSortResults() {
    const searchOptionsArr = [
      this.#requestOptions.filterResults === true ? 'filtered' : 'unfiltered',
      this.#requestOptions.facetsAreLikely === true ? 'faceted' : 'unfaceted',
      this.#sortCriteria.getNonSemanticSortOptions(),
    ];
    if (!this.#sortCriteria.areScoresRequired())
      searchOptionsArr.push('score-zero');

    if (this.#pageWith) {
      // if pageWith is set, find the page that contains the document with the specified ID
      const docToFind = this.#pageWith;
      const docs = fn
        .subsequence(
          cts.search(
            SearchCriteriaProcessor.evalQueryString(this.getCtsQueryStr()),
            searchOptionsArr,
          ),
          1,
          MAXIMUM_PAGE_WITH_LENGTH + 1,
        )
        .toArray();

      if (docs.length > MAXIMUM_PAGE_WITH_LENGTH) {
        console.warn(
          `The search exceeded the pageWith limit (${MAXIMUM_PAGE_WITH_LENGTH}) with base search criteria ${JSON.stringify(this.getSearchCriteria())}`,
        );
      }

      const foundDocIndex = docs.findIndex((doc) => doc.baseURI === docToFind);
      if (foundDocIndex === -1) {
        throw new InvalidSearchRequestError(
          `The document ID specified by pageWith (${this.#pageWith}) could not be found in the first ${MAXIMUM_PAGE_WITH_LENGTH} search results`,
        );
      }
      const foundDocPage = Math.ceil((foundDocIndex + 1) / this.#pageLength);
      const results = docs
        .slice(
          (foundDocPage - 1) * this.#pageLength,
          foundDocPage * this.#pageLength,
        )
        .map((doc) => ({ id: doc.baseURI, type: doc.xpath('/json/type') }));
      return { resultPage: foundDocPage, results };
    } else {
      // else, pageWith is not set, paginate based on normal page and pageLength
      const docs = fn
        .subsequence(
          cts.search(
            SearchCriteriaProcessor.evalQueryString(this.getCtsQueryStr()),
            searchOptionsArr,
          ),
          utils.getStartingPaginationIndexForSubsequence(
            this.#page,
            this.#pageLength,
          ),
          this.#pageLength,
        )
        .toArray();
      const results = docs.map((doc) => ({
        id: doc.baseURI,
        type: doc.xpath('/json/type'),
      }));
      return { resultPage: this.#page, results };
    }
  }

  #buildMultiScopeQueryOrRecurse() {
    if (!this.#allowMultiScope) {
      throw new InvalidSearchRequestError(
        `search scope of 'multi' not supported by this operation or level.`,
      );
    }
    if (this.#resolvedSearchCriteria.OR) {
      const orArr = this.#resolvedSearchCriteria.OR;
      SearchCriteriaProcessor.requireSearchCriteriaArray(orArr);

      if (orArr.length === 0) {
        // if OR array is empty, do nothing, we will try to generate with empty criteria which will throw an error
        this.#resolvedSearchCriteria = {};
        return;
      } else if (orArr.length === 1) {
        this.process(
          orArr[0],
          null, // search criteria must define scope.
          false, // reject nested multi scope requests.
          this.#searchPatternOptions,
          this.#includeTypeConstraint,
          this.#page,
          this.#pageLength,
          this.#pageWith,
          this.#sortCriteria,
          this.#valuesOnly,
        );
        // return since we are making a recursive call to this.process()
        return;
      } else {
        const parts = orArr.map((subCriteria) => {
          const subScope = subCriteria._scope;
          const { filterResults, facetsAreLikely, synonymsEnabled } =
            this.#requestOptions;
          const searchCriteriaProcessor = new SearchCriteriaProcessor(
            filterResults,
            facetsAreLikely,
            synonymsEnabled,
          );
          try {
            searchCriteriaProcessor.process(
              subCriteria,
              null, // search criteria must define scope.
              false, // reject nested multi scope requests.
              this.#searchPatternOptions,
              this.#includeTypeConstraint,
              this.#page,
              this.#pageLength,
              this.#pageWith,
              this.#sortCriteria,
              this.#valuesOnly,
            );
          } catch (e) {
            e.message = `Error in scope '${subScope}': ${e.message}`;
            throw e;
          }
          return searchCriteriaProcessor.getCtsQueryStr();
        });

        this.#ctsQueryStr = `cts.orQuery([${parts.join(',')}])`;
        // return since we have set this.#ctsQueryStr based on other calls to searchCriteriaProcessor.process()
        return;
      }
    } else {
      throw new InvalidSearchRequestError(
        `a search with scope 'multi' must contain an 'OR' array`,
      );
    }
  }

  // Protect from a repo-wide search as repo-wide facets are expensive to calculate, even when
  // applying a scope search.
  #requireCriteria() {
    if (
      this.#criteriaCnt < 1 ||
      !utils.isNonEmptyString(this.#ctsQueryStrWithTokens)
    ) {
      if (this.#ignoredTerms.length > 0) {
        throw new InvalidSearchRequestError(
          `the search criteria given only contains '${JSON.stringify(this.#ignoredTerms)}', which is an ignored term(s). Please consider creating phrases using double quotes and/or adding additional criteria.`,
        );
      }
      throw new InvalidSearchRequestError(`more search criteria is required.`);
    }
  }
  //#endregion
};

export { START_OF_GENERATED_QUERY, SearchCriteriaProcessor };
