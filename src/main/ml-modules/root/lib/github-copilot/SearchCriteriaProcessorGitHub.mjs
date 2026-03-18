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

// New internal handler classes
import { ProcessorConfig } from './search-criteria/ProcessorConfig.mjs';
import { MultiScopeProcessor } from './search-criteria/MultiScopeProcessor.mjs';
import { CtsQueryBuilder } from './search-criteria/CtsQueryBuilder.mjs';

// Once supported, we want to stop calculating scores.
const FROM_SEARCH_OPTIONS = { scoreMethod: 'simple' };

const START_OF_GENERATED_QUERY = `
const op = require("/MarkLogic/optic");
const crm = op.prefixer("http://www.cidoc-crm.org/cidoc-crm/");
const la = op.prefixer("https://linked.art/ns/terms/");
const lux = op.prefixer("https://lux.collections.yale.edu/ns/");
const skos = op.prefixer("http://www.w3.org/2004/02/skos/core#");`;

const MAXIMUM_PAGE_WITH_LENGTH = ProcessorConfig.MAXIMUM_PAGE_WITH_LENGTH;

const SearchCriteriaProcessorGitHub = class {
  constructor(filterResults, facetsAreLikely, synonymsEnabled) {
    // Capture all constructor parameters as request options, enabling search patterns to utilize.
    this.requestOptions = {
      filterResults,
      facetsAreLikely,
      synonymsEnabled,
    };

    this.searchTermsConfig = getSearchTermsConfig();

    // Internal handler instances for separated concerns
    this._multiScopeProcessor = new MultiScopeProcessor();
    this._ctsQueryBuilder = new CtsQueryBuilder();

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
    allowMultiScope,
    searchPatternOptions,
    includeTypeConstraint,
    page,
    pageLength,
    pageWith,
    sortCriteria,
    valuesOnly,
  ) {
    this.resolvedSearchCriteria =
      SearchCriteriaProcessorGitHub._requireSearchCriteriaJson(
        scopeName,
        searchCriteria,
      );
    searchCriteria = null; // use this.resolvedSearchCriteria

    this.allowMultiScope = allowMultiScope;
    this.page = page;
    this.pageLength = pageLength;
    this.pageWith = pageWith;
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
          ProcessorConfig.getErrorMessage(
            'INVALID_SEARCH_SCOPE',
            this.resolvedSearchCriteria._scope,
          ),
        );
      }
    } else {
      throw new InvalidSearchRequestError(
        ProcessorConfig.getErrorMessage('SEARCH_SCOPE_NOT_SPECIFIED'),
      );
    }
    scopeName = null; // use this.scopeName (or this.requestOptions.scopeName).

    // Handle multi-scope searches using dedicated processor
    if (this.scopeName === ProcessorConfig.SEARCH_SCOPE_MULTI) {
      this._multiScopeProcessor.validateMultiScopeRequirements(
        this.allowMultiScope,
        this.resolvedSearchCriteria,
      );

      const processParams = {
        searchPatternOptions,
        includeTypeConstraint,
        page,
        pageLength,
        pageWith,
        sortCriteria,
        valuesOnly,
      };

      const result = this._multiScopeProcessor.processMultiScopeSearch(
        this,
        this.resolvedSearchCriteria.OR,
        processParams,
      );

      if (result) {
        // Multi-scope processor built query string
        this.ctsQueryStr = result;
        return;
      } else {
        // Multi-scope processor recursed, we're done
        return;
      }
    }

    this.ctsQueryStrWithTokens = this.generateQueryFromCriteria(
      this.scopeName,
      this.resolvedSearchCriteria,
      null,
      true, // Must return a CTS query.
      false, // Return cts.falseQuery when the top-level term is unusable.
    );

    // Protect from a repo-wide search as repo-wide facets are expensive to calculate, even when
    // applying a scope search.
    if (
      this.criteriaCnt < 1 ||
      !utils.isNonEmptyString(this.ctsQueryStrWithTokens)
    ) {
      if (this.ignoredTerms.length > 0) {
        throw new InvalidSearchRequestError(
          ProcessorConfig.getErrorMessage(
            'IGNORED_TERMS_ONLY',
            this.ignoredTerms,
          ),
        );
      }
      throw new InvalidSearchRequestError(
        ProcessorConfig.getErrorMessage('MORE_CRITERIA_REQUIRED'),
      );
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
      getSearchScopeTypes(this.scopeName, false), // default to none
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
      SearchCriteriaProcessorGitHub.evalQueryString(this.getCtsQueryStr()),
    );
  }

  // returns { resultPage: number, results: Array<{id: string, type: string}> }
  getSearchResults() {
    const sortType = SearchCriteriaProcessorGitHub.getSortTypeFromSortCriteria(
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

  // returns { resultPage: number, results: Array<{id: string, type: string}> }
  _getMultiScopeSortResults() {
    const ctsQuery = SearchCriteriaProcessorGitHub.evalQueryString(
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

    // This variable determines if each search result should be represented once yet has more than one triple with sortPredicate
    // (e.g., co-produced items) or multiple names to sort on (e.g., sort names in multiple languages).
    // For now, this defaults to true. Feel free to parameterize if desired.
    const oneSortValuePerResult = true;
    const { predicate, indexReference, order } =
      this.sortCriteria.getSemanticSortOption();
    const ctsQuery = SearchCriteriaProcessorGitHub.evalQueryString(
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

    // // The following is necessary when one wants each search result represented once yet has more than one triple with sortPredicate
    // // (e.g., co-produced items) or multiple names to sort on (e.g., sort names in multiple languages).
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
        ProcessorConfig.getLogMessage(
          'EXCEEDED_PAGE_LIMIT',
          MAXIMUM_PAGE_WITH_LENGTH,
          this.getSearchCriteria(),
        ),
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
            SearchCriteriaProcessorGitHub.evalQueryString(
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
          ProcessorConfig.getLogMessage(
            'EXCEEDED_PAGE_WITH_LIMIT',
            MAXIMUM_PAGE_WITH_LENGTH,
            this.getSearchCriteria(),
          ),
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
            SearchCriteriaProcessorGitHub.evalQueryString(
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

  // Get query.  If you're looking for the query with different token values, use resolveTokens.
  getCtsQueryStr() {
    // Finalize the query
    this.ctsQueryStr =
      this.ctsQueryStr.length > 0 ? this.ctsQueryStr : cts.parse('');

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
    returnTrueForUnusableTerms = true,
  ) {
    return this._ctsQueryBuilder.buildQuery({
      scopeName,
      searchCriteria,
      parentSearchTerm,
      mustReturnCtsQuery,
      returnTrueForUnusableTerms,
      processor: this,
    });
  }

  _parseAndValidateTerm(
    scopeName,
    searchCriteria,
    parentSearchTerm,
    mustReturnCtsQuery,
  ) {
    let searchTerm = new SearchTerm()
      .addScopeName(scopeName)
      .addMustReturnCtsQuery(mustReturnCtsQuery) // unlikely this function needs or should change this value.
      .addParentSearchTerm(parentSearchTerm);
    for (const key of Object.keys(searchCriteria)) {
      // Ignore reserved property names.
      if (!ProcessorConfig.RESERVED_PROPERTY_NAMES.includes(key)) {
        if (key.startsWith('_')) {
          searchTerm.setProperty(key.substring(1), searchCriteria[key]);
        } else if (!searchTerm.hasName()) {
          const termName = key;
          searchTerm.setName(termName);

          // Need to check for the property's existence as zero is a valid value.
          if (!searchCriteria.hasOwnProperty(termName)) {
            throw new InvalidSearchRequestError(
              ProcessorConfig.getErrorMessage('TERM_REQUIRES_VALUE', termName),
            );
          }
        } else {
          throw new InvalidSearchRequestError(
            ProcessorConfig.getErrorMessage(
              'MULTIPLE_TERM_NAMES',
              searchCriteria,
            ),
          );
        }
      }
    }
    if (!searchTerm.hasName()) {
      throw new InvalidSearchRequestError(
        ProcessorConfig.getErrorMessage('NO_TERM_NAME', searchCriteria),
      );
    }

    const termName = searchTerm.getName();
    let termValue = searchCriteria[termName];

    // If able to tokenize the value into multiple, create an AND and send back.
    if (utils.isString(termValue)) {
      const tokenizedValues =
        SearchCriteriaProcessorGitHub._tokenizeSearchTermValue(
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

    // Determine the object type of the value, whether it is allowed by the pattern, and whether
    // we should make some adjustments.
    const patternName = searchTermConfig.getPatternName();
    if (typeof termValue == 'object') {
      // When the term value has the 'id' property and the term config specifies an ID index
      // reference, redefine the term to match on an ID value.
      if (
        SearchCriteriaProcessorGitHub._hasIdChildTerm(termValue) &&
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
            }),
          );
      } else {
        if (SearchCriteriaProcessorGitHub._hasGroup(termValue)) {
          searchTerm.setValueType(TYPE_GROUP);
          if (!acceptsGroup(patternName)) {
            throw new InvalidSearchRequestError(
              ProcessorConfig.getErrorMessage(
                'TERM_CONTAINS_GROUP_NOT_ALLOWED',
                termName,
              ),
            );
          }
        } else if (
          SearchCriteriaProcessorGitHub.hasNonOptionPropertyName(termValue)
        ) {
          searchTerm.setValueType(TYPE_TERM);
          if (!acceptsTerm(patternName)) {
            throw new InvalidSearchRequestError(
              ProcessorConfig.getErrorMessage(
                'TERM_CONTAINS_TERM_NOT_ALLOWED',
                termName,
              ),
            );
          }
        }

        // When the term value has the 'id' property and is configured to the hop inverse IRI pattern
        // pattern, change the 'id' property to 'iri'.
        if (
          SearchCriteriaProcessorGitHub._hasIdChildTerm(termValue) &&
          isConvertIdChildToIri(patternName)
        ) {
          termValue.iri = termValue.id;
          delete termValue.id;
        }

        // There are a couple contexts where we need to know a little about the child term.
        const targetScopeName = searchTermConfig.getTargetScopeName();
        searchTerm.addChildInfo(
          this._getPartialChildSearchTermInfo(
            targetScopeName || scopeName,
            termValue,
          ),
        );

        // Always attempt to accept the target scope when specified by the search term.
        if (targetScopeName && targetScopeName != scopeName) {
          if (!isSearchScopeName(targetScopeName)) {
            throw new InternalServerError(
              ProcessorConfig.getErrorMessage(
                'INVALID_TARGET_SCOPE',
                termName,
                targetScopeName,
              ),
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
        ProcessorConfig.getErrorMessage(
          'TERM_ONLY_ID_CHILD',
          termName,
          scopeName,
        ),
      );
    } else if (!acceptsAtomicValue(patternName)) {
      throw new InvalidSearchRequestError(
        ProcessorConfig.getErrorMessage(
          'TERM_NO_ATOMIC_VALUES',
          termName,
          scopeName,
        ),
      );
    } else {
      searchTerm.setValueType(TYPE_ATOMIC);
    }

    // Ensure there is numeric weight
    if (!searchTerm.hasNumericWeight()) {
      searchTerm.setWeight(ProcessorConfig.DEFAULT_WEIGHT);
    }

    SearchCriteriaProcessorGitHub._cleanTermValues(searchTerm);

    // Ignore punctuation-only terms and stop words
    if (
      ProcessorConfig.PUNCTUATION_REGEX.test(termValue) ||
      (typeof termValue == 'string' && STOP_WORDS.has(termValue.toLowerCase()))
    ) {
      searchTerm.setUsable(false);
      this.ignoredTerms.push(termValue);
    }

    return searchTerm;
  }

  _getPartialChildSearchTermInfo(scopeName, termValue) {
    const hasGroup = SearchCriteriaProcessorGitHub._hasGroup(termValue);

    // May override when not a group.
    let willReturnCtsQuery = hasGroup;
    let valueType = TYPE_GROUP;
    let patternName = null;

    if (!hasGroup) {
      const termName =
        SearchCriteriaProcessorGitHub.getFirstNonOptionPropertyName(termValue);
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

  // Get a search term's configuration by scope name and term name.  Exception thrown when an invalid combination.
  _getSearchTermConfig(scopeName, termName) {
    const scopedTerms = this.searchTermsConfig[scopeName];
    if (!scopedTerms) {
      throw new InternalServerError(
        ProcessorConfig.getErrorMessage('NO_TERMS_FOR_SCOPE', scopeName),
      );
    } else if (!scopedTerms[termName]) {
      const validChoices = Object.keys(scopedTerms).sort();
      throw new InvalidSearchRequestError(
        ProcessorConfig.getErrorMessage(
          'INVALID_TERM_FOR_SCOPE',
          termName,
          scopeName,
          validChoices,
        ),
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
      SearchCriteriaProcessorGitHub.getFirstNonOptionPropertyName(termValue) !=
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
    if (SearchCriteriaProcessorGitHub._isKeywordTerm(searchTerm)) {
      // The return of this function could include cleaned up values.
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
      ProcessorConfig.getErrorMessage('OBJECT_EXPECTED', searchCriteria),
    );
  }

  static _requireSearchCriteriaArray(searchCriteria) {
    if (utils.isArray(searchCriteria)) {
      return true;
    }
    throw new InvalidSearchRequestError(
      ProcessorConfig.getErrorMessage('ARRAY_EXPECTED', searchCriteria),
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

    return SearchCriteriaProcessorGitHub.translateStringGrammarToJSON(
      scopeName,
      searchCriteria,
    );
  }

  static _tokenizeSearchTermValue(value, leaveAsIs) {
    // Just return the value in an array when told not to manipulate the value.
    if (leaveAsIs) {
      return [value];
    }

    if (utils.isString(value)) {
      // Do not tokenize when (there isn't a space or) the value starts and ends with matching quote characters.
      value = value.trim();
      if (
        !value.includes(' ') ||
        ProcessorConfig.PHRASE_QUOTE_REGEX.test(value)
      ) {
        return [value];
      }
      return utils.splitHonoringPhrases(value);
    }

    throw new InternalServerError(
      ProcessorConfig.getErrorMessage('TOKENIZE_NON_STRING'),
    );
  }

  static translateStringGrammarToJSON(scopeName, searchCriteria) {
    if (!isSearchScopeName(scopeName)) {
      throw new InvalidSearchRequestError(
        ProcessorConfig.getErrorMessage('INVALID_SEARCH_SCOPE', scopeName),
      );
    }
    // Parse as ML's search grammar and convert to the LUX Search JSON format.  There are no bindings.
    const adjustedSearchCriteriaStr =
      SearchCriteriaProcessorGitHub._adjustSearchString(searchCriteria);
    let ctsQueryObj = null;
    try {
      ctsQueryObj = cts.parse(adjustedSearchCriteriaStr).toObject();
    } catch (e) {
      throw new InvalidSearchRequestError(
        ProcessorConfig.getErrorMessage(
          'UNABLE_TO_PARSE_CRITERIA',
          searchCriteria,
        ),
      );
    }
    return {
      _scope: scopeName,
      ...SearchCriteriaProcessorGitHub._walkParsedQuery(ctsQueryObj),
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
        piece = piece.replace(ProcessorConfig.BRACKET_REGEX, ' ');

        // Uppercase the operators
        if (foundOperators.length > 0) {
          foundOperators.forEach((op) => {
            const re = new RegExp(`\\s${op}\\s`, 'ig');
            piece = piece.replace(re, ` ${op} `);
          });
        }

        // Until we support NEAR, lowercase NEAR to avoid search returning an error that it is not supported.
        piece = piece.replace(ProcessorConfig.NEAR_OPERATOR_REGEX, '$1near$2');

        // Tokenize once more to perform term-level adjustments.
        adjustedSearchString += piece
          .split(/\s/)
          .map((term) => {
            // Terms containing more than one colon (e.g., ils:yul:mfhd:8752038) will not get past cts.parse
            // unless quoted.  We cannot quote every term as that could change the meaning of the query
            // (e.g., AND vs "AND").  If we ever want to support the string grammar's colon operator, this
            // logic will need to be refined.
            return ProcessorConfig.COLON_TERM_REGEX.test(term)
              ? `"${term}"`
              : term;
          })
          .join(' ');
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
            SearchCriteriaProcessorGitHub._walkParsedQuery(item),
          );
        }
      } else if (propName == 'notQuery') {
        searchCriteriaJson.NOT = [
          SearchCriteriaProcessorGitHub._walkParsedQuery(
            ctsQueryObj.notQuery.query,
          ),
        ];
      } else if (propName == 'boostQuery') {
        searchCriteriaJson.BOOST = [];
        searchCriteriaJson.BOOST.push(
          SearchCriteriaProcessorGitHub._walkParsedQuery(
            ctsQueryObj.boostQuery.matchingQuery,
          ),
        );
        searchCriteriaJson.BOOST.push(
          SearchCriteriaProcessorGitHub._walkParsedQuery(
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
              ProcessorConfig.getLogMessage('IGNORING_SEARCH_OPTION', option),
            );
          }
        }
      } else {
        // Better to ignore or bring back warnings?
        throw new InvalidSearchRequestError(
          ProcessorConfig.getErrorMessage(
            'UNSUPPORTED_GRAMMAR_PORTION',
            propName,
          ),
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
    const isMultiScope = sortBinding.subSorts != null;
    const isSemantic = sortBinding.predicate != null;
    return SearchCriteriaProcessorGitHub.getSortType(isMultiScope, isSemantic);
  }

  static getSortTypeFromSortCriteria(sortCriteria) {
    const isMultiScope = sortCriteria.hasMultiScopeSortOption();
    const isSemantic = sortCriteria.hasSemanticSortOption();
    return SearchCriteriaProcessorGitHub.getSortType(isMultiScope, isSemantic);
  }

  // Examples input includes cts.*Query() and cts.*Values().  The point in using this is to ensure
  // search-related constants are defined.
  static evalQueryString(queryStr) {
    return fn.head(
      xdmp.eval(
        `${START_OF_GENERATED_QUERY}; const q = ${queryStr}; q; export default q`,
      ),
    );
  }
};

export { START_OF_GENERATED_QUERY, SearchCriteriaProcessorGitHub };
