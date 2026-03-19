import op from '/MarkLogic/optic';
import { getSearchTermsConfig } from '../../config/searchTermsConfig.mjs';
import { SearchTerm } from '../SearchTerm.mjs';
import { SearchTermConfig } from '../SearchTermConfig.mjs';
import { SearchPatternOptions } from '../SearchPatternOptions.mjs';
import { STOP_WORDS } from '../../data/stopWords.mjs';
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
import {
  resolveSearchOptionsName,
  sanitizeAndValidateWildcardedStrings,
  TOKEN_FIELDS,
  TOKEN_PREDICATES,
  TOKEN_TYPES,
} from '../searchLib.mjs';
import {
  getSearchScopeFields,
  getSearchScopePredicates,
  getSearchScopeTypes,
  isSearchScopeName,
} from '../searchScope.mjs';
import {
  SORT_TYPE_MULTI_SCOPE,
  SORT_TYPE_NON_SEMANTIC,
  SORT_TYPE_SEMANTIC,
  SortCriteria,
} from '../SortCriteria.mjs';
import {
  REG_EXP_NEAR_OPERATOR,
  SEARCH_GRAMMAR_OPERATORS,
  SEARCH_OPTIONS_NAME_KEYWORD,
  SEMANTIC_SORT_TIMEOUT,
} from '../appConstants.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
} from '../errorClasses.mjs';
import * as utils from '../../utils/utils.mjs';

// Once supported, we want to stop calculating scores.
const FROM_SEARCH_OPTIONS = { scoreMethod: 'simple' };

const START_OF_GENERATED_QUERY = `
const op = require("/MarkLogic/optic");
const crm = op.prefixer("http://www.cidoc-crm.org/cidoc-crm/");
const la = op.prefixer("https://linked.art/ns/terms/");
const lux = op.prefixer("https://lux.collections.yale.edu/ns/");
const skos = op.prefixer("http://www.w3.org/2004/02/skos/core#");`;

const MAXIMUM_PAGE_WITH_LENGTH = 100000;

const SearchCriteriaProcessorM365v1 = class {
  constructor(filterResults, facetsAreLikely, synonymsEnabled) {
    // Capture all constructor parameters as request options, enabling search patterns to utilize.
    this.requestOptions = {
      filterResults,
      facetsAreLikely,
      synonymsEnabled,
    };
    this.searchTermsConfig = getSearchTermsConfig();

    // Given to process()
    this.scopeName;
    this.allowMultiScope;
    this.searchPatternOptions;
    this.includeTypeConstraint; // Patterns can override to false.
    this.page;
    this.pageLength;
    this.pageWith;
    this.sortCriteria;

    // Populated via process()
    this.resolvedSearchCriteria = null;
    this.criteriaCnt = 0; // Keep abbreviation style for consistency with codebase conventions.
    this.ignoredTerms = [];
    // Internally treat this as a "template" that contains tokens to be resolved later
    this.ctsQueryTemplate = '';
    // Final resolved string or (fallback) cts.parse('') object is stored here
    this.ctsQueryStr = '';
    this.valuesOnly = false;
    this.values = [];
  }

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
    // Normalize inputs and initialize fields for this request
    this._initProcessState(
      scopeName,
      allowMultiScope,
      searchPatternOptions,
      includeTypeConstraint,
      page,
      pageLength,
      pageWith,
      sortCriteria,
      valuesOnly,
    );

    // Resolve/validate criteria JSON and scope
    this.resolvedSearchCriteria =
      SearchCriteriaProcessorM365v1._requireSearchCriteriaJson(
        this.scopeName, // give precedence to explicit scopeName param
        searchCriteria,
      );

    // Scope resolution and validation (also sets requestOptions.scopeName)
    this._resolveAndValidateScope();

    // Handle "multi" scope early and return when done
    if (this.scopeName === 'multi') {
      this._buildMultiScopeOrQueryOrRecurse();
      return; // early return: multi-scope logic sets this.ctsQueryStr
    }

    // Build query template from criteria (string with tokens)
    this.ctsQueryTemplate = this.generateQueryFromCriteria(
      this.scopeName,
      this.resolvedSearchCriteria,
      null,
      true, // Must return a CTS query.
      false, // Return cts.falseQuery when the top-level term is unusable.
    );

    // Protect from a repo-wide search as repo-wide facets are expensive to calculate
    this._validatePresenceOfUsableCriteria();

    // Optionally add type constraint (using tokens for scope-specific estimates)
    if (this.includeTypeConstraint) {
      this.ctsQueryTemplate = `cts.andQuery([
        cts.jsonPropertyValueQuery('dataType', ${TOKEN_TYPES}, ['exact']),
        ${this.ctsQueryTemplate}
      ])`;
    }

    // Resolve tokens into a final query string
    this.ctsQueryStr = this._finalizeResolvedQuery();
  }

  // region ------------ Public getters (unchanged signatures) ------------

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
      SearchCriteriaProcessorM365v1.evalQueryString(this.getCtsQueryStr()),
    );
  }

  // returns { resultPage: number, results: Array<{id: string, type: string}> }
  getSearchResults() {
    const sortType = SearchCriteriaProcessorM365v1.getSortTypeFromSortCriteria(
      this.sortCriteria,
    );
    if (SORT_TYPE_MULTI_SCOPE === sortType) {
      return this._getMultiScopeSortResults();
    } else if (SORT_TYPE_SEMANTIC === sortType) {
      return this._getSemanticSortResults();
    } else {
      return this._getNonSemanticSortResults();
    }
  }

  // endregion ---------- Public getters ----------

  // region ------------ Sorting (intentionally unchanged) ------------
  // returns { resultPage: number, results: Array<{id: string, type: string}> }
  _getMultiScopeSortResults() {
    const ctsQuery = SearchCriteriaProcessorM365v1.evalQueryString(
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
    const subSortPlans = subSortConfigs.map((subSortConfig) =>
      this._getSubSortPlan(subSortConfig),
    );
    const unionSubSortPlan = subSortPlans.reduce(
      (combinedPlan, subSortPlan) => {
        if (combinedPlan === null) {
          return subSortPlan;
        } else {
          return combinedPlan.union(subSortPlan);
        }
      },
      null,
    );
    const finalPlan = docPlan
      .joinLeftOuter(unionSubSortPlan, op.on('fragmentId', 'fragmentId'))
      .joinDocUri(op.col('uri'), op.fragmentIdCol('fragmentId'));
    if (this.pageWith) {
      return this._getOpticPageWithResults(finalPlan, order);
    } else {
      return this._getOpticPaginatedResults(finalPlan, order);
    }
  }

  _getSubSortPlan(subSortConfig) {
    // can add an if statement here to handle semantic sorts
    return this._getFieldReferencePlan(subSortConfig);
  }

  _getFieldReferencePlan(subSortConfig) {
    return op.fromLexicons(
      {
        sortByMe: cts.fieldReference(subSortConfig.indexReference),
      },
      null,
      op.fragmentIdCol('fragmentId'),
    );
  }

  // returns { resultPage: number, results: Array<{id: string, type: string}> }
  _getSemanticSortResults() {
    xdmp.setRequestTimeLimit(SEMANTIC_SORT_TIMEOUT);

    // TODO: Consider making oneSortValuePerResult configurable via sortCriteria in a follow-up.
    const oneSortValuePerResult = true;

    const { predicate, indexReference, order } =
      this.sortCriteria.getSemanticSortOption();

    const ctsQuery = SearchCriteriaProcessorM365v1.evalQueryString(
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

    // indexed value lookup by IRI
    const indexedFieldPlan = op.fromLexicons({
      fieldDocIri: cts.iriReference(),
      sortByMe: cts.fieldReference(indexReference),
    });

    // Add the sortByMe values to the rows, where the index's fieldDocIri matches the triple's objectIri
    semanticSortPlan = semanticSortPlan.joinLeftOuter(
      indexedFieldPlan,
      op.on('objectIri', 'fieldDocIri'),
    );

    if (oneSortValuePerResult === true) {
      // When a search value has multiple values to sort by, they prevail in the following order:
      // - for multiple triples: whichever objectIri comes first in ascending string order
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

    if (this.pageWith) {
      return this._getOpticPageWithResults(semanticSortPlan, order);
    } else {
      return this._getOpticPaginatedResults(semanticSortPlan, order);
    }
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
      .map(({ uri }) => ({
        id: uri,
        type: cts.doc(uri).xpath('/json/type'),
      }));
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
        `The search exceeded the ${MAXIMUM_PAGE_WITH_LENGTH} limit with base search criteria ${JSON.stringify(
          this.getSearchCriteria(),
        )}`,
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
      .map(({ uri }) => ({
        id: uri,
        type: cts.doc(uri).xpath('/json/type'),
      }));
    return { resultPage: foundUriPage, results };
  }

  // returns { resultPage: number, results: Array<{id: string, type: string}> }
  _getNonSemanticSortResults() {
    const searchOptionsArr = [
      this.requestOptions.filterResults === true ? 'filtered' : 'unfiltered',
      this.requestOptions.facetsAreLikely === true ? 'faceted' : 'unfaceted',
      this.sortCriteria.getNonSemanticSortOptions(),
    ];

    if (!this.sortCriteria.areScoresRequired()) {
      searchOptionsArr.push('score-zero');
    }

    if (this.pageWith) {
      // if pageWith is set, find the page that contains the document with the specified ID
      const docToFind = this.pageWith;
      const docs = fn
        .subsequence(
          cts.search(
            SearchCriteriaProcessorM365v1.evalQueryString(
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
          `The search exceeded the pageWith limit (${MAXIMUM_PAGE_WITH_LENGTH}) with base search criteria ${JSON.stringify(
            this.getSearchCriteria(),
          )}`,
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
      // else, pageWith is not set, paginate based on normal page and pageLength
      const docs = fn
        .subsequence(
          cts.search(
            SearchCriteriaProcessorM365v1.evalQueryString(
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

  // endregion --------- Sorting ---------

  // region ------------ Query getters / token resolution ------------

  // Get query. If you're looking for the query with different token values, use resolveTokens.
  getCtsQueryStr() {
    // Finalize the query
    // "Confusing but okay" behavior preserved: when empty, fall back to cts.parse('') (returns a query object)
    this.ctsQueryStr =
      this.ctsQueryStr && this.ctsQueryStr.length > 0
        ? this.ctsQueryStr
        : cts.parse('');
    return this.ctsQueryStr;
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
   * Private: resolve tokens within query string. This assists in the support of providing estimates
   * for additional search scopes.
   *
   * @param {Array} tokenArr - Array of objects where each object specifies the following properties:
   * pattern: The token's pattern, which may be found in the optimized plan and CTS query.
   * value: The value to replace the token with (all instances). Arrays are "stringified";
   * all other values are used as is --may want to quote strings.
   * @returns {String} Query after resolving tokens.
   */
  _resolveTokens(tokenArr) {
    // UNIT TEST CANDIDATE: replacement correctness (arrays / scalars), no-op when template empty
    let template = this.ctsQueryTemplate;
    tokenArr.forEach((token) => {
      const val = Array.isArray(token.value)
        ? utils.arrayToString(token.value, token.scalarType)
        : token.value;
      const regEx = new RegExp(token.pattern, 'g');
      if (utils.isNonEmptyString(template)) {
        template = template.replace(regEx, val);
      }
    });
    return template;
  }

  // endregion --------- Query getters / token resolution ---------

  // region ------------ Query generation (criteria -> template) ------------

  generateQueryFromCriteria(
    scopeName,
    searchCriteria,
    parentSearchTerm = null,
    mustReturnCtsQuery = false,
    returnTrueForUnusableTerms = true,
  ) {
    // UNIT TEST CANDIDATE: operator dispatch (AND / OR / NOT / BOOST), terminal path
    let ctsQueryStr = '';
    SearchCriteriaProcessorM365v1._requireSearchCriteriaObject(searchCriteria);

    // Group operators (AND / OR)
    if (
      Object.prototype.hasOwnProperty.call(searchCriteria, 'AND') ||
      Object.prototype.hasOwnProperty.call(searchCriteria, 'OR')
    ) {
      const isAnd = Object.prototype.hasOwnProperty.call(searchCriteria, 'AND');
      const groupName = isAnd ? 'AND' : 'OR';
      const groupArr = searchCriteria[groupName];
      SearchCriteriaProcessorM365v1._requireSearchCriteriaArray(groupArr);

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
          true, // process() will catch if this is the only search criteria term and it gets ignored.
        );
      } else {
        ctsQueryStr += this._openGroup(isAnd ? 'and' : 'or');
        groupArr.forEach((item, idx) => {
          ctsQueryStr +=
            (idx > 0 ? ', ' : '') +
            this.generateQueryFromCriteria(
              scopeName,
              item,
              parentSearchTerm,
              true,
              isAnd, // we want cts.trueQuery when within an AND.
            );
        });
        ctsQueryStr += '])';
      }
      return ctsQueryStr;
    }

    // NOT operator
    if (Object.prototype.hasOwnProperty.call(searchCriteria, 'NOT')) {
      const notCriteria = searchCriteria.NOT;
      if (utils.isArray(notCriteria)) {
        const orCriteria = { OR: notCriteria.map((item) => item) };
        return `cts.notQuery(${this.generateQueryFromCriteria(
          scopeName,
          orCriteria,
          parentSearchTerm,
          mustReturnCtsQuery, // no need to override.
          true, // ANDs impose their own value.
        )})`;
      } else if (utils.isObject(notCriteria)) {
        return `cts.notQuery(${this.generateQueryFromCriteria(
          scopeName,
          notCriteria,
          parentSearchTerm,
          true,
          true, // We want cts.trueQuery so as to avoid cts.notQuery(cts.falseQuery)
        )})`;
      } else {
        throw new InvalidSearchRequestError(
          `object or array expected for NOT search criteria but given ${JSON.stringify(
            searchCriteria,
          )}`,
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
${this.generateQueryFromCriteria(
  scopeName,
  searchCriteria.BOOST[0],
  parentSearchTerm,
  true,
  false, // Do not search for everything.
)},
${this.generateQueryFromCriteria(
  scopeName,
  searchCriteria.BOOST[1],
  parentSearchTerm,
  true,
  false, // Do not boost by everything.
)}
)`;
      } else {
        throw new InvalidSearchRequestError(
          `the BOOST operator requires an array of two items.`,
        );
      }
    }

    // Terminal / term path
    let searchTerm = this._parseAndValidateTerm(
      scopeName,
      searchCriteria,
      parentSearchTerm,
      mustReturnCtsQuery,
    );

    if (searchTerm.hasModifiedCriteria()) {
      // Re-enter for modified criteria (typically AND of tokenized values)
      return this.generateQueryFromCriteria(
        scopeName,
        searchTerm.getModifiedCriteria(),
        parentSearchTerm,
        mustReturnCtsQuery,
        true, // Unless logic in _parseAndValidateTerm changes, modified criteria will be an AND.
      );
    }

    if (searchTerm.isUsable()) {
      const patternResponse = applyPattern({
        searchCriteriaProcessor: this,
        searchTerm,
        searchPatternOptions: this.searchPatternOptions,
        requestOptions: this.requestOptions,
      });

      if (utils.isNonEmptyString(patternResponse.codeStr)) {
        ctsQueryStr = patternResponse.codeStr;
      }

      // Append values when patterns return them (for related lists).
      if (utils.isNonEmptyArray(patternResponse.values)) {
        this.values = this.values.concat(patternResponse.values);
      }

      // A single search term can exclude the type constraint (related lists).
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

    return ctsQueryStr;
  }

  _openGroup(kind /* 'and' | 'or' */) {
    return `cts.${kind}Query([`;
  }

  // endregion --------- Query generation ---------

  // region ------------ Term parsing & validation (split into micro-steps) ------------

  _parseAndValidateTerm(
    scopeName,
    searchCriteria,
    parentSearchTerm,
    mustReturnCtsQuery,
  ) {
    // Mirrors original behavior with clearer structure.
    let searchTerm = new SearchTerm()
      .addScopeName(scopeName)
      .addMustReturnCtsQuery(mustReturnCtsQuery) // unlikely this function needs or should change this value.
      .addParentSearchTerm(parentSearchTerm);

    // Extract name and copy _options into properties
    this._extractNameAndOptions(searchTerm, searchCriteria);

    if (!searchTerm.hasName()) {
      throw new InvalidSearchRequestError(
        `search term does not specify a term name in criteria ${JSON.stringify(
          searchCriteria,
        )}`,
      );
    }

    const termName = searchTerm.getName();
    let termValue = searchCriteria[termName];

    // Tokenize string values into AND of tokens unless flagged to leave as-is
    if (utils.isString(termValue)) {
      const tokenizedValues =
        SearchCriteriaProcessorM365v1._tokenizeSearchTermValue(
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
            criterion._tokenized = true;
            return criterion;
          }),
        });
      }
      termValue = tokenizedValues[0];
    }

    searchTerm.setValue(termValue);

    const searchTermConfig = this._getSearchTermConfig(scopeName, termName);
    searchTerm.setSearchTermConfig(searchTermConfig);

    // Normalize ID-child or group/term/atomic classification + target-scope hop handling
    this._normalizeIdChildIfNeeded(
      searchTerm,
      searchTermConfig,
      termName,
      termValue,
      scopeName,
    );
    this._classifyValueType(searchTerm, searchTermConfig, termName, termValue);
    this._applyTargetScopeIfAny(
      searchTerm,
      searchTermConfig,
      termName,
      scopeName,
      termValue,
    );

    // Defaults and hygiene
    this._ensureNumericWeight(searchTerm);
    SearchCriteriaProcessorM365v1._cleanTermValues(searchTerm);
    this._ignoreIfStopWordOrPunctuationOnly(searchTerm);

    return searchTerm;
  }

  _extractNameAndOptions(searchTerm, searchCriteria) {
    for (const key of Object.keys(searchCriteria)) {
      // Ignore reserved property names.
      if (!['_scope', '_valueType'].includes(key)) {
        if (key.startsWith('_')) {
          searchTerm.setProperty(key.substring(1), searchCriteria[key]);
        } else if (!searchTerm.hasName()) {
          const termName = key;
          searchTerm.setName(termName);
          // Need to check for the property's existence as zero is a valid value.
          if (!Object.prototype.hasOwnProperty.call(searchCriteria, termName)) {
            throw new InvalidSearchRequestError(
              `the '${termName}' term requires a value.`,
            );
          }
        } else {
          throw new InvalidSearchRequestError(
            `search term defines more than one term name in criteria ${JSON.stringify(
              searchCriteria,
            )}`,
          );
        }
      }
    }
  }

  _normalizeIdChildIfNeeded(
    searchTerm,
    searchTermConfig,
    termName,
    termValue,
    scopeName,
  ) {
    const patternName = searchTermConfig.getPatternName();
    if (typeof termValue === 'object') {
      // When the term value has the 'id' property and the term config specifies an ID index reference,
      // redefine the term to match on an ID value.
      if (
        SearchCriteriaProcessorM365v1._hasIdChildTerm(termValue) &&
        searchTermConfig.hasIdIndexReferences()
      ) {
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
        // replace original searchTerm with normalized one
        searchTerm.copyFrom(normalized); // assumes SearchTerm supports copying; if not, set properties one-by-one
      } else {
        // id -> iri conversion when configured to do so
        if (
          SearchCriteriaProcessorM365v1._hasIdChildTerm(termValue) &&
          isConvertIdChildToIri(patternName)
        ) {
          termValue.iri = termValue.id;
          delete termValue.id;
          searchTerm.setValue(termValue);
        }
      }
    }
  }

  _classifyValueType(searchTerm, searchTermConfig, termName, termValue) {
    const patternName = searchTermConfig.getPatternName();
    if (typeof termValue === 'object') {
      if (SearchCriteriaProcessorM365v1._hasGroup(termValue)) {
        searchTerm.setValueType(TYPE_GROUP);
        if (!acceptsGroup(patternName)) {
          throw new InvalidSearchRequestError(
            `the '${termName}' term contains a group but is not allowed to.`,
          );
        }
      } else if (
        SearchCriteriaProcessorM365v1.hasNonOptionPropertyName(termValue)
      ) {
        searchTerm.setValueType(TYPE_TERM);
        if (!acceptsTerm(patternName)) {
          throw new InvalidSearchRequestError(
            `the '${termName}' term contains another term but is not allowed to.`,
          );
        }
      }
    } else if (
      searchTermConfig.hasIdIndexReferences() &&
      !searchTermConfig.hasPatternName()
    ) {
      throw new InvalidSearchRequestError(
        `the search term '${termName}' in scope '${searchTerm.getScopeName()}' only supports the 'id' child search term.`,
      );
    } else if (!acceptsAtomicValue(patternName)) {
      throw new InvalidSearchRequestError(
        `the search term '${termName}' in scope '${searchTerm.getScopeName()}' does not accept atomic values.`,
      );
    } else {
      searchTerm.setValueType(TYPE_ATOMIC);
    }
  }

  _applyTargetScopeIfAny(
    searchTerm,
    searchTermConfig,
    termName,
    scopeName,
    termValue,
  ) {
    const hasGroup = SearchCriteriaProcessorM365v1._hasGroup(termValue);
    const targetScopeName = searchTermConfig.getTargetScopeName();

    // child info: used when we need to know a bit about the child term
    searchTerm.addChildInfo(
      this._getPartialChildSearchTermInfo(
        targetScopeName || scopeName,
        termValue,
      ),
    );

    // Always attempt to accept the target scope when specified by the search term.
    if (targetScopeName && targetScopeName !== scopeName) {
      if (!isSearchScopeName(targetScopeName)) {
        throw new InternalServerError(
          `The '${termName}' search term is configured to an invalid target scope: '${targetScopeName}'`,
        );
      }
      searchTerm.setScopeName(targetScopeName);
    }
  }

  _ensureNumericWeight(searchTerm) {
    if (!searchTerm.hasNumericWeight()) {
      searchTerm.setWeight(1.0);
    }
  }

  _ignoreIfStopWordOrPunctuationOnly(searchTerm) {
    const termValue = searchTerm.getValue();
    const punctuationOnly = /^[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]*$/.test(
      typeof termValue === 'string' ? termValue : '',
    );
    if (
      punctuationOnly ||
      (typeof termValue === 'string' && STOP_WORDS.has(termValue.toLowerCase()))
    ) {
      searchTerm.setUsable(false);
      this.ignoredTerms.push(termValue);
    }
  }

  _getPartialChildSearchTermInfo(scopeName, termValue) {
    // UNIT TEST CANDIDATE: correctness of willReturnCtsQuery/valueType heuristics
    const hasGroup = SearchCriteriaProcessorM365v1._hasGroup(termValue);
    let willReturnCtsQuery = hasGroup;
    let valueType = TYPE_GROUP;
    let patternName = null;

    if (!hasGroup) {
      const termName =
        SearchCriteriaProcessorM365v1.getFirstNonOptionPropertyName(termValue);
      const searchTermConfig = this._getSearchTermConfig(scopeName, termName);
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

  _getSearchTermConfig(scopeName, termName) {
    const scopedTerms = this.searchTermsConfig[scopeName];
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

  // endregion --------- Term parsing & validation ---------

  // region ------------ Static helpers (kept, with notes) ------------

  static _hasIdChildTerm(termValue) {
    return termValue && typeof termValue.id === 'string';
  }

  static getFirstNonOptionPropertyName(termValue) {
    let propName = null;
    if (utils.isObject(termValue)) {
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
      SearchCriteriaProcessorM365v1.getFirstNonOptionPropertyName(termValue) !=
      null
    );
  }

  static _hasGroup(termValue) {
    return (
      termValue &&
      (termValue.AND || termValue.OR || termValue.NOT || termValue.BOOST)
    );
  }

  static _cleanTermValues(searchTerm) {
    if (SearchCriteriaProcessorM365v1._isKeywordTerm(searchTerm)) {
      // UNIT TEST CANDIDATE: wildcard cleaning / validation
      searchTerm.setValue(
        sanitizeAndValidateWildcardedStrings(searchTerm.getValue()),
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
          searchTermConfig.getPatternName(),
        )
    );
  }

  static _requireSearchCriteriaObject(searchCriteria) {
    if (utils.isObject(searchCriteria)) {
      return true;
    }
    throw new InvalidSearchRequestError(
      `object expected but given ${JSON.stringify(searchCriteria)}`,
    );
  }

  static _requireSearchCriteriaArray(searchCriteria) {
    if (utils.isArray(searchCriteria)) {
      return true;
    }
    throw new InvalidSearchRequestError(
      `array expected but given ${JSON.stringify(searchCriteria)}`,
    );
  }

  // Accept search criteria formats:
  //
  // 1. JSON
  // 2. Stringified JSON
  // 3. Search string abiding by the LUX-supported subset of ML's search grammar.
  //
  static _requireSearchCriteriaJson(scopeName, searchCriteria) {
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

    return SearchCriteriaProcessorM365v1.translateStringGrammarToJSON(
      scopeName,
      searchCriteria,
    );
  }

  static _tokenizeSearchTermValue(value, leaveAsIs) {
    // UNIT TEST CANDIDATE: honoring quotes, whitespace tokenization, multi-colon strings
    // Just return the value in an array when told not to manipulate the value.
    if (leaveAsIs) {
      return [value];
    }
    if (utils.isString(value)) {
      // Do not tokenize when (there isn't a space or) the value starts and ends with matching quote characters.
      value = value.trim();
      const quoted = value.match(/^('|").+\1$/) != null;
      if (!value.includes(' ') || quoted) {
        return [value];
      }
      return utils.splitHonoringPhrases(value);
    }
    throw new InternalServerError(
      '_tokenizeSearchTermValue must be given a non-null string.',
    );
  }

  // UNIT TEST CANDIDATE: end-to-end string -> JSON conversion across operators + options
  static translateStringGrammarToJSON(scopeName, searchCriteria) {
    if (!isSearchScopeName(scopeName)) {
      throw new InvalidSearchRequestError(
        `'${scopeName}' is not a valid search scope.`,
      );
    }

    // Parse as ML's search grammar and convert to the LUX Search JSON format. There are no bindings.
    const adjustedSearchCriteriaStr =
      SearchCriteriaProcessorM365v1._adjustSearchString(searchCriteria);

    let ctsQueryObj = null;
    try {
      ctsQueryObj = cts.parse(adjustedSearchCriteriaStr).toObject();
    } catch (e) {
      throw new InvalidSearchRequestError(
        `unable to parse criteria ${searchCriteria}`,
      );
    }

    return {
      _scope: scopeName,
      ...SearchCriteriaProcessorM365v1._walkParsedQuery(ctsQueryObj),
    };
  }

  // UNIT TEST CANDIDATE: operator normalization, bracket handling, NEAR downcase, colon quoting
  static _adjustSearchString(givenQueryString) {
    // Find all operators within the search string. These are used later.
    const foundOperators = SEARCH_GRAMMAR_OPERATORS.filter((opName) => {
      const re = new RegExp(`\\s${opName}\\s`, 'i');
      return re.test(givenQueryString);
    });

    // Temporarily breakdown the given query, selectively modifying it before putting it back together.
    let adjustedSearchString = '';
    const bracketRegEx = new RegExp('[\\[\\]]', 'g');

    // May be able to refactor to use utils.splitHonoringPhrases().
    givenQueryString.split('"').map((piece, i) => {
      const isIndexEven = i % 2 == 0; // even indexes are non-quoted
      if (isIndexEven) {
        // Until we start supporting term-level options, remove all unquoted brackets to avoid 'unexpected token'
        piece = piece.replace(bracketRegEx, ' ');

        // Uppercase the operators
        if (foundOperators.length > 0) {
          foundOperators.forEach((opName) => {
            const re = new RegExp(`\\s${opName}\\s`, 'ig');
            piece = piece.replace(re, ` ${opName} `);
          });
        }

        // Until we support NEAR, lowercase NEAR to avoid search returning an error that it is not supported.
        piece = piece.replace(REG_EXP_NEAR_OPERATOR, '$1near$2');

        // Token-level adjustments: quote multi-colon terms to avoid cts.parse errors
        adjustedSearchString += piece
          .split(/\s/)
          .map((term) => (term.includes(':') ? `"${term}"` : term))
          .join(' ');
      } else {
        // Quoted strings: when no space inside, it's unstemmed
        const unstemmed = piece.match(' ') == null;
        adjustedSearchString += `"${piece}"${unstemmed ? '[unstemmed]' : ''}`;
      }
    });

    return adjustedSearchString;
  }

  // UNIT TEST CANDIDATE: correct mapping of cts.parse() object to our JSON grammar
  static _walkParsedQuery(ctsQueryObj) {
    const searchCriteriaJson = {};
    for (const propName of Object.keys(ctsQueryObj)) {
      if (['andQuery', 'orQuery'].includes(propName)) {
        const operator = propName
          .substring(0, propName.length - 5)
          .toUpperCase();
        searchCriteriaJson[operator] = [];
        if (utils.isNonEmptyArray(ctsQueryObj[propName].queries)) {
          for (const item of ctsQueryObj[propName].queries) {
            searchCriteriaJson[operator].push(
              SearchCriteriaProcessorM365v1._walkParsedQuery(item),
            );
          }
        }
      } else if (propName == 'notQuery') {
        searchCriteriaJson.NOT = [
          SearchCriteriaProcessorM365v1._walkParsedQuery(
            ctsQueryObj.notQuery.query,
          ),
        ];
      } else if (propName == 'boostQuery') {
        searchCriteriaJson.BOOST = [];
        searchCriteriaJson.BOOST.push(
          SearchCriteriaProcessorM365v1._walkParsedQuery(
            ctsQueryObj.boostQuery.matchingQuery,
          ),
        );
        searchCriteriaJson.BOOST.push(
          SearchCriteriaProcessorM365v1._walkParsedQuery(
            ctsQueryObj.boostQuery.boostingQuery,
          ),
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
              `Ignoring search term option '${option}' from cts.parse result.`,
            );
          }
        }
      } else {
        // Better to ignore or bring back warnings?
        throw new InvalidSearchRequestError(
          `'${propName}' is not a supported portion of the search string grammar.`,
        );
      }
    }
    return searchCriteriaJson;
  }

  // Single definition of which sort type gets precedence.
  static getSortType(isMultiScope, isSemantic) {
    let sortType = SORT_TYPE_NON_SEMANTIC;
    if (isMultiScope) {
      sortType = SORT_TYPE_MULTI_SCOPE;
    } else if (isSemantic) {
      sortType = SORT_TYPE_SEMANTIC;
    }
    return sortType;
  }

  static getSortTypeFromSortBinding(sortBinding) {
    if (utils.isObject(sortBinding)) {
      const isMultiScope = sortBinding.subSorts != null;
      const isSemantic = sortBinding.predicate != null;
      return SearchCriteriaProcessorM365v1.getSortType(
        isMultiScope,
        isSemantic,
      );
    }
    throw new InternalServerError(
      'sortBinding is required to determine sort type.',
    );
  }

  static getSortTypeFromSortCriteria(sortCriteria) {
    const isMultiScope = sortCriteria.hasMultiScopeSortOption();
    const isSemantic = sortCriteria.hasSemanticSortOption();
    return SearchCriteriaProcessorM365v1.getSortType(isMultiScope, isSemantic);
  }

  // Examples input includes cts.*Query() and cts.*Values(). The point in using this is to ensure
  // search-related constants are defined.
  static evalQueryString(queryStr) {
    // TODO: Security posture – inputs are internally generated; if externalized, ensure strict allowlist for function tokens.
    return fn.head(
      xdmp.eval(
        `${START_OF_GENERATED_QUERY}; const q = ${queryStr}; q; export default q`,
      ),
    );
  }

  // endregion --------- Static helpers ---------

  // region ------------ Private orchestration helpers ------------

  _initProcessState(
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
    this.ctsQueryTemplate = '';
    this.ctsQueryStr = '';
    this.values = [];
  }

  _resolveAndValidateScope() {
    if (this.resolvedSearchCriteria._scope) {
      const scopeName = this.resolvedSearchCriteria._scope.trim().toLowerCase();
      if (isSearchScopeName(scopeName)) {
        this.scopeName = scopeName;
        delete this.resolvedSearchCriteria._scope;
        // Some search patterns need to know the requested search scope
        this.requestOptions.scopeName = scopeName;
        return;
      }
      throw new InvalidSearchRequestError(
        `'${this.resolvedSearchCriteria._scope}' is not a valid search scope.`,
      );
    } else {
      throw new InvalidSearchRequestError(`search scope not specified.`);
    }
  }

  _buildMultiScopeOrQueryOrRecurse() {
    if (!this.allowMultiScope) {
      throw new InvalidSearchRequestError(
        `search scope of 'multi' not supported by this operation or level.`,
      );
    }
    if (this.resolvedSearchCriteria.OR) {
      const orArr = this.resolvedSearchCriteria.OR;
      SearchCriteriaProcessorM365v1._requireSearchCriteriaArray(orArr);

      if (orArr.length === 0) {
        // if OR array is empty, do nothing; generating with empty criteria will error later
        return;
      } else if (orArr.length === 1) {
        // Recurse into single OR
        const { filterResults, facetsAreLikely, synonymsEnabled } =
          this.requestOptions;
        const searchCriteriaProcessor = new SearchCriteriaProcessorM365v1(
          filterResults,
          facetsAreLikely,
          synonymsEnabled,
        );
        searchCriteriaProcessor.process(
          orArr[0],
          null, // search criteria must define scope.
          false, // reject nested multi scope requests.
          this.searchPatternOptions,
          this.includeTypeConstraint,
          this.page,
          this.pageLength,
          this.pageWith,
          this.sortCriteria,
          this.valuesOnly,
        );
        this.ctsQueryStr = searchCriteriaProcessor.getCtsQueryStr();
        return;
      } else {
        // Build cts.orQuery([...]) by evaluating each sub-criteria independently and concatenating
        const parts = orArr.map((subCriteria) => {
          const subScope = subCriteria._scope;
          const { filterResults, facetsAreLikely, synonymsEnabled } =
            this.requestOptions;
          const searchCriteriaProcessor = new SearchCriteriaProcessorM365v1(
            filterResults,
            facetsAreLikely,
            synonymsEnabled,
          );
          try {
            searchCriteriaProcessor.process(
              subCriteria,
              null, // search criteria must define scope.
              false, // reject nested multi scope requests.
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

  _validatePresenceOfUsableCriteria() {
    if (
      this.criteriaCnt < 1 ||
      !utils.isNonEmptyString(this.ctsQueryTemplate)
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

  _finalizeResolvedQuery() {
    const resolved = this.resolveTokens(
      getSearchScopeFields(this.scopeName, true), // default to all
      getSearchScopePredicates(this.scopeName), // defaults to any
      getSearchScopeTypes(this.scopeName, false), // default to none
    );
    return resolved;
  }

  // endregion --------- Private orchestration helpers ---------
};

export { START_OF_GENERATED_QUERY, SearchCriteriaProcessorM365v1 };
