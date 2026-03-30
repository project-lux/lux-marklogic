//#region Imports
import op from '/MarkLogic/optic';
import { getSearchTermsConfig } from '../../config/searchTermsConfig.mjs';
import {
  SORT_TYPE_MULTI_SCOPE,
  SORT_TYPE_NON_SEMANTIC,
  SORT_TYPE_SEMANTIC,
} from '../SortCriteria.mjs';
import { SEMANTIC_SORT_TIMEOUT } from '../appConstants.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
} from '../errorClasses.mjs';
import { TOKEN_FIELDS, TOKEN_PREDICATES, TOKEN_TYPES } from '../searchLib.mjs';
import * as utils from '../../utils/utils.mjs';

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
} from '../searchScope.mjs';
import { isSearchScopeName } from '../searchScope.mjs';
import { SearchPatternOptions } from '../SearchPatternOptions.mjs';
import { SortCriteria } from '../SortCriteria.mjs';
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

const SearchCriteriaProcessorM365v2 = class {
  //#region Constructor(s)
  constructor(filterResults, facetsAreLikely, synonymsEnabled) {
    // requestOptions preserved for patterns
    this.requestOptions = { filterResults, facetsAreLikely, synonymsEnabled };
    this.searchTermsConfig = getSearchTermsConfig();

    // Given to process()
    this.scopeName;
    this.allowMultiScope;
    this.searchPatternOptions;
    this.includeTypeConstraint;
    this.page;
    this.pageLength;
    this.pageWith;
    this.sortCriteria;

    // Populated via process()
    this.resolvedSearchCriteria = null;
    this.criteriaCnt = 0;
    this.ignoredTerms = [];
    this.ctsQueryStrWithTokens = '';
    this.ctsQueryStr = '';
    this.valuesOnly = false;
    this.values = [];
  }
  //#endregion

  //#region Public instance methods
  // Processes and validates search criteria, ending with a fully resolved query.
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
    this._initProcessState({
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
    this.resolvedSearchCriteria =
      SearchCriteriaProcessorM365v2.requireSearchCriteriaJson(
        this.scopeName,
        searchCriteria,
      );

    // Validate and finalize scope into this + requestOptions
    this._resolveAndValidateScope();

    // Early branch for multi-scope (unchanged behavior)
    if (this.scopeName === 'multi') {
      this._buildMultiScopeQueryOrRecurse();
      // Return if we have a query, else allow to flow through to empty criteria check.
      if (utils.isNonEmptyString(this.ctsQueryStr)) {
        return;
      }
    } else {
      // Build CTS query template (string)
      this.ctsQueryStrWithTokens = this.generateQueryFromCriteria(
        this.scopeName,
        this.resolvedSearchCriteria,
        null,
        true, // mustReturnCtsQuery
        false, // returnTrueForUnusableTerms
      );
    }

    this._requireCriteria();

    // Optional type constraint injection
    if (this.includeTypeConstraint) {
      this.ctsQueryStrWithTokens = `cts.andQuery([
        cts.jsonPropertyValueQuery('dataType', ${TOKEN_TYPES}, ['exact']),
        ${this.ctsQueryStrWithTokens}
      ])`;
    }

    // Resolve tokens to final query
    this.ctsQueryStr = this.resolveTokens(
      getSearchScopeFields(this.scopeName, true),
      getSearchScopePredicates(this.scopeName),
      getSearchScopeTypes(this.scopeName, false),
    );
  }

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

  getCtsQueryStr() {
    // Preserved: when empty, fall back to cts.parse('') (query object)
    this.ctsQueryStr =
      this.ctsQueryStr && this.ctsQueryStr.length > 0
        ? this.ctsQueryStr
        : cts.parse('');
    return this.ctsQueryStr;
  }

  getEstimate() {
    return cts.estimate(
      SearchCriteriaProcessorM365v2.evalQueryString(this.getCtsQueryStr()),
    );
  }

  // returns { resultPage: number, results: Array<{id: string, type: string}> }
  getSearchResults() {
    const sortType = SearchCriteriaProcessorM365v2.getSortTypeFromSortCriteria(
      this.sortCriteria,
    );
    // TODO: these are the three to consolidate in the Optic version.
    if (SORT_TYPE_MULTI_SCOPE === sortType) {
      return this._getMultiScopeSortResults();
    } else if (SORT_TYPE_SEMANTIC === sortType) {
      return this._getSemanticSortResults();
    } else {
      return this._getNonSemanticSortResults();
    }
  }

  getValues() {
    return this.values;
  }

  // Pass-through method for backward compatibility
  generateQueryFromCriteria(
    scopeName,
    searchCriteria,
    parentSearchTerm = null,
    mustReturnCtsQuery = false,
    returnTrueForUnusableTerms = true,
  ) {
    return generateQueryFromCriteria(
      this,
      scopeName,
      searchCriteria,
      parentSearchTerm,
      mustReturnCtsQuery,
      returnTrueForUnusableTerms,
    );
  }

  resolveTokens(fieldsArr, predicatesArr, typesArr) {
    const tokens = [
      { pattern: TOKEN_FIELDS, value: fieldsArr, scalarType: 'string' },
      { pattern: TOKEN_PREDICATES, value: predicatesArr, scalarType: 'code' },
      { pattern: TOKEN_TYPES, value: typesArr, scalarType: 'string' },
    ];

    let out = this.ctsQueryStrWithTokens;
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
      return SearchCriteriaProcessorM365v2.getSortType(
        isMultiScope,
        isSemantic,
      );
    }
    throw new InternalServerError(
      'sortBinding is required to determine sort type.',
    );
  }

  static getSortTypeFromSortCriteria(sortCriteria) {
    return SearchCriteriaProcessorM365v2.getSortType(
      sortCriteria.hasMultiScopeSortOption(),
      sortCriteria.hasSemanticSortOption(),
    );
  }

  static evalQueryString(queryStr) {
    // TODO: will the Optic version still need this?  Would prefer to avoid eval or add protection.
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
      SearchCriteriaProcessorM365v2.getFirstNonOptionPropertyName(termValue) !=
      null
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
  // UNIT TEST CANDIDATE: scope normalization and precedence
  _initProcessState({
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
    this.scopeName = scopeName;
    this.allowMultiScope = allowMultiScope;
    this.page = page;
    this.pageLength = pageLength;
    this.pageWith = pageWith;
    this.sortCriteria =
      sortCriteria instanceof SortCriteria
        ? sortCriteria
        : new SortCriteria(sortCriteria || '');
    this.valuesOnly = valuesOnly;

    this.searchPatternOptions = searchPatternOptions
      ? searchPatternOptions
      : new SearchPatternOptions();

    this.includeTypeConstraint = includeTypeConstraint;

    // reset per-invocation fields
    this.criteriaCnt = 0;
    this.ignoredTerms = [];
    this.ctsQueryStrWithTokens = '';
    this.ctsQueryStr = '';
    this.values = [];
  }

  // Resolves the scope from criteria, validates it, and applies it to this + requestOptions
  _resolveAndValidateScope() {
    const sc = this.resolvedSearchCriteria;
    if (sc && utils.isNonEmptyString(sc._scope)) {
      const normalized = sc._scope.trim().toLowerCase();
      if (isSearchScopeName(normalized)) {
        this.scopeName = normalized;
        delete sc._scope;
        this.requestOptions.scopeName = normalized; // some patterns need this
        return;
      }
      throw new InvalidSearchRequestError(
        `'${sc._scope}' is not a valid search scope.`,
      );
    }
    throw new InvalidSearchRequestError(`search scope not specified.`);
  }

  _getMultiScopeSortResults() {
    const ctsQuery = SearchCriteriaProcessorM365v2.evalQueryString(
      this.getCtsQueryStr(),
    );
    const docPlan = op.fromSearch(
      ctsQuery,
      ['fragmentId'],
      null,
      FROM_SEARCH_OPTIONS,
    );
    const { order, subSortConfigs } =
      this.sortCriteria.getMultiScopeSortOption();
    const subSortPlans = subSortConfigs.map((cfg) => this._getSubSortPlan(cfg));
    const unionSubSortPlan = subSortPlans.reduce(
      (acc, p) => (acc === null ? p : acc.union(p)),
      null,
    );
    const finalPlan = docPlan
      .joinLeftOuter(unionSubSortPlan, op.on('fragmentId', 'fragmentId'))
      .joinDocUri(op.col('uri'), op.fragmentIdCol('fragmentId'));
    return this.pageWith
      ? this._getOpticPageWithResults(finalPlan, order)
      : this._getOpticPaginatedResults(finalPlan, order);
  }

  _getSubSortPlan(subSortConfig) {
    return this._getFieldReferencePlan(subSortConfig);
  }

  _getFieldReferencePlan(subSortConfig) {
    return op.fromLexicons(
      { sortByMe: cts.fieldReference(subSortConfig.indexReference) },
      null,
      op.fragmentIdCol('fragmentId'),
    );
  }

  _getSemanticSortResults() {
    xdmp.setRequestTimeLimit(SEMANTIC_SORT_TIMEOUT);
    // TODO: Consider making oneSortValuePerResult configurable via sortCriteria in a follow-up.
    const oneSortValuePerResult = true;

    const { predicate, indexReference, order } =
      this.sortCriteria.getSemanticSortOption();
    const ctsQuery = SearchCriteriaProcessorM365v2.evalQueryString(
      this.getCtsQueryStr(),
    );
    const ctsPlan = op
      .fromSearch(ctsQuery)
      .joinDocUri('uri', op.fragmentIdCol('fragmentId'));

    const triplePlan = op.fromTriples(
      op.pattern(
        op.col('subjectIri'),
        predicate,
        op.col('objectIri'),
        op.fragmentIdCol('fragmentId'),
      ),
    );

    let semanticSortPlan = ctsPlan.joinLeftOuter(triplePlan);

    const indexedFieldPlan = op.fromLexicons({
      fieldDocIri: cts.iriReference(),
      sortByMe: cts.fieldReference(indexReference),
    });

    semanticSortPlan = semanticSortPlan.joinLeftOuter(
      indexedFieldPlan,
      op.on('objectIri', 'fieldDocIri'),
    );

    if (oneSortValuePerResult === true) {
      semanticSortPlan = semanticSortPlan.groupBy(
        ['uri'],
        [
          order === 'ascending'
            ? op.min('sortByMe', op.col('sortByMe'))
            : op.max('sortByMe', op.col('sortByMe')),
        ],
      );
    }

    return this.pageWith
      ? this._getOpticPageWithResults(semanticSortPlan, order)
      : this._getOpticPaginatedResults(semanticSortPlan, order);
  }

  _getOpticPaginatedResults(opticPlan, order) {
    const results = opticPlan
      .orderBy(
        order === 'ascending'
          ? op.asc(op.col('sortByMe'))
          : op.desc(op.col('sortByMe')),
      )
      .offset((this.page - 1) * this.pageLength)
      .limit(this.pageLength)
      .result()
      .toArray()
      .map(({ uri }) => ({ id: uri, type: cts.doc(uri).xpath('/json/type') }));
    return { resultPage: this.page, results };
  }

  _getOpticPageWithResults(opticPlan, order) {
    const uriToFind = this.pageWith;
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
        `The document ID specified by pageWith (${this.pageWith}) could not be found in the first ${MAXIMUM_PAGE_WITH_LENGTH} search results`,
      );
    }
    const foundUriPage = Math.ceil((foundUriIndex + 1) / this.pageLength);
    const results = planOutput
      .slice(
        (foundUriPage - 1) * this.pageLength,
        foundUriPage * this.pageLength,
      )
      .map(({ uri }) => ({ id: uri, type: cts.doc(uri).xpath('/json/type') }));
    return { resultPage: foundUriPage, results };
  }

  _getNonSemanticSortResults() {
    const searchOptionsArr = [
      this.requestOptions.filterResults === true ? 'filtered' : 'unfiltered',
      this.requestOptions.facetsAreLikely === true ? 'faceted' : 'unfaceted',
      this.sortCriteria.getNonSemanticSortOptions(),
    ];
    if (!this.sortCriteria.areScoresRequired())
      searchOptionsArr.push('score-zero');

    if (this.pageWith) {
      const docToFind = this.pageWith;
      const docs = fn
        .subsequence(
          cts.search(
            SearchCriteriaProcessorM365v2.evalQueryString(
              this.getCtsQueryStr(),
            ),
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
          `The document ID specified by pageWith (${this.pageWith}) could not be found in the first ${MAXIMUM_PAGE_WITH_LENGTH} search results`,
        );
      }
      const foundDocPage = Math.ceil((foundDocIndex + 1) / this.pageLength);
      const results = docs
        .slice(
          (foundDocPage - 1) * this.pageLength,
          foundDocPage * this.pageLength,
        )
        .map((doc) => ({ id: doc.baseURI, type: doc.xpath('/json/type') }));
      return { resultPage: foundDocPage, results };
    } else {
      const docs = fn
        .subsequence(
          cts.search(
            SearchCriteriaProcessorM365v2.evalQueryString(
              this.getCtsQueryStr(),
            ),
            searchOptionsArr,
          ),
          utils.getStartingPaginationIndexForSubsequence(
            this.page,
            this.pageLength,
          ),
          this.pageLength,
        )
        .toArray();
      const results = docs.map((doc) => ({
        id: doc.baseURI,
        type: doc.xpath('/json/type'),
      }));
      return { resultPage: this.page, results };
    }
  }

  _buildMultiScopeQueryOrRecurse() {
    if (!this.allowMultiScope) {
      throw new InvalidSearchRequestError(
        `search scope of 'multi' not supported by this operation or level.`,
      );
    }
    if (this.resolvedSearchCriteria.OR) {
      const orArr = this.resolvedSearchCriteria.OR;
      SearchCriteriaProcessorM365v2.requireSearchCriteriaArray(orArr);

      if (orArr.length === 0) {
        // Let empty OR arrays fall through to normal processing and validation
        this.resolvedSearchCriteria = {};
        return;
      } else if (orArr.length === 1) {
        const { filterResults, facetsAreLikely, synonymsEnabled } =
          this.requestOptions;
        const searchCriteriaProcessor = new SearchCriteriaProcessorM365v2(
          filterResults,
          facetsAreLikely,
          synonymsEnabled,
        );
        searchCriteriaProcessor.process(
          orArr[0],
          null,
          false,
          this.searchPatternOptions,
          this.includeTypeConstraint,
          this.page,
          this.pageLength,
          this.pageWith,
          this.sortCriteria,
          this.valuesOnly,
        );
        this.ctsQueryStr = searchCriteriaProcessor.getCtsQueryStr();
        this.scopeName = searchCriteriaProcessor.scopeName;
        return;
      } else {
        const parts = orArr.map((subCriteria) => {
          const subScope = subCriteria._scope;
          const { filterResults, facetsAreLikely, synonymsEnabled } =
            this.requestOptions;
          const searchCriteriaProcessor = new SearchCriteriaProcessorM365v2(
            filterResults,
            facetsAreLikely,
            synonymsEnabled,
          );
          try {
            searchCriteriaProcessor.process(
              subCriteria,
              null,
              false,
              this.searchPatternOptions,
              this.includeTypeConstraint,
              this.page,
              this.pageLength,
              this.pageWith,
              this.sortCriteria,
              this.valuesOnly,
            );
          } catch (e) {
            e.message = `Error in scope '${subScope}': ${e.message}`;
            throw e;
          }
          return searchCriteriaProcessor.getCtsQueryStr();
        });

        this.ctsQueryStr = `cts.orQuery([${parts.join(',')}])`;
        return;
      }
    } else {
      throw new InvalidSearchRequestError(
        `a search with scope 'multi' must contain an 'OR' array`,
      );
    }
  }

  _requireCriteria() {
    if (
      this.criteriaCnt < 1 ||
      !utils.isNonEmptyString(this.ctsQueryStrWithTokens)
    ) {
      if (this.ignoredTerms.length > 0) {
        throw new InvalidSearchRequestError(
          `the search criteria given only contains '${this.ignoredTerms.join(
            "', '",
          )}', which is an ignored term(s). Please consider creating phrases using double quotes and/or adding additional criteria.`,
        );
      }
      throw new InvalidSearchRequestError(`more search criteria is required.`);
    }
  }
  //#endregion
};

export { START_OF_GENERATED_QUERY, SearchCriteriaProcessorM365v2 };
