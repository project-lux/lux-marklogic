import { StopWatch } from '../utils/stopWatch.mjs';
import {
  AS_TYPE_ORDERED_COLLECTION,
  AS_TYPE_ORDERED_COLLECTION_PAGE,
  DEFAULT_FILTER_SEARCH_RESULTS,
  DEFAULT_SEARCH_OPTIONS_EXACT,
  DEFAULT_SEARCH_OPTIONS_KEYWORD,
  LUX_CONTEXT,
  SEARCH_OPTIONS_INVERSE_MAP,
  SEARCH_OPTIONS_NAME_EXACT,
  SEARCH_OPTIONS_NAME_KEYWORD,
  SYNONYMS_ENABLED,
  TRACE_NAME_SEARCH as traceName,
} from './appConstants.mjs';
import * as utils from '../utils/utils.mjs';
import { SortCriteria } from './SortCriteria.mjs';
import {
  getOrderedUserInterfaceSearchScopeNames,
  getSearchScope,
  isUserInterfaceSearchScopeName,
} from './searchScope.mjs';
import { SearchCriteriaProcessor } from './SearchCriteriaProcessor.mjs';
import { getDefaultSearchOptionsNameByPatternName } from './searchPatternsLib.mjs';
import {
  InvalidSearchRequestError,
  isInvalidSearchRequestError,
} from './mlErrorsLib.mjs';
import {
  getRelatedList,
  getRelatedListSearchInfo,
} from './relatedListsLib.mjs';

const MAXIMUM_PAGE_LENGTH = 100;

const EMPTY_STRING = '';
const DEFAULT_ALLOW_MULTI_SCOPE = true;
const DEFAULT_MAY_CHANGE_SCOPE = false;
const DEFAULT_INCLUDE_TYPE_CONSTRAINT = true;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_LENGTH = 20;
const DEFAULT_REQUEST_CONTEXT = 'unspecified';
const DEFAULT_MAY_EXCEED_MAXIMUM_PAGE_LENGTH = false;
const DEFAULT_MAY_ESTIMATE = true;
const DEFAULT_FILTER_RESULTS_NO_CONTEXT = true;
const DEFAULT_FACETS_SOON = false;
const DEFAULT_FACETS_ARE_LIKELY = DEFAULT_FACETS_SOON;
const DEFAULT_SYNONYMS_ENABLED = SYNONYMS_ENABLED;
const DEFAULT_VALUES_ONLY = false;

const TOKEN_FIELDS = '@@FIELDS@@';
const TOKEN_PREDICATES = '@@PREDICATES@@';
const TOKEN_TYPES = '@@TYPES@@';
const SCOPE_LABELS = {
  item: 'Objects',
  work: 'Works',
  agent: 'People & Groups',
  place: 'Places',
  concept: 'Concepts',
  event: 'Events',
  set: 'Sets',
  multi: 'Multiple Types',
};
const SCOPE_DESCRIPTORS = {
  item: 'physical and digital objects',
  work: 'intellectual works',
  agent: 'individuals and organizations',
  place: 'locations',
  concept: 'concepts',
  event: 'events',
  set: 'sets',
  multi: 'multiple types',
};

// Public
function search({
  searchCriteria = null,
  searchScope = null,
  mayChangeScope = DEFAULT_MAY_CHANGE_SCOPE,
  page = DEFAULT_PAGE,
  pageLength = DEFAULT_PAGE_LENGTH,
  requestContext = DEFAULT_REQUEST_CONTEXT,
  mayExceedMaximumPageLength = DEFAULT_MAY_EXCEED_MAXIMUM_PAGE_LENGTH,
  mayEstimate = DEFAULT_MAY_ESTIMATE,
  sortDelimitedStr = EMPTY_STRING,
  filterResults = DEFAULT_FILTER_SEARCH_RESULTS,
  facetsSoon = DEFAULT_FACETS_SOON,
  synonymsEnabled = DEFAULT_SYNONYMS_ENABLED,
  valuesOnly = DEFAULT_VALUES_ONLY,
}) {
  return _search(
    {
      searchCriteria,
      searchScope,
      mayChangeScope,
      page,
      pageLength,
      requestContext,
      mayExceedMaximumPageLength,
      mayEstimate,
      sortDelimitedStr,
      filterResults,
      facetsSoon,
      synonymsEnabled,
      valuesOnly,
    },
    false
  );
}

// Private.  May call itself upon changing the search scope.
function _search(
  {
    searchCriteria = null,
    searchScope = null,
    mayChangeScope = DEFAULT_MAY_CHANGE_SCOPE,
    page = DEFAULT_PAGE,
    pageLength = DEFAULT_PAGE_LENGTH,
    requestContext = DEFAULT_REQUEST_CONTEXT,
    mayExceedMaximumPageLength = DEFAULT_MAY_EXCEED_MAXIMUM_PAGE_LENGTH,
    mayEstimate = DEFAULT_MAY_ESTIMATE,
    sortDelimitedStr = EMPTY_STRING,
    filterResults = DEFAULT_FILTER_SEARCH_RESULTS,
    facetsSoon = DEFAULT_FACETS_SOON,
    synonymsEnabled = DEFAULT_SYNONYMS_ENABLED,
    valuesOnly = DEFAULT_VALUES_ONLY,
  },
  changedScope = false
) {
  const stopWatch = new StopWatch(true);
  const requestId = utils.assignRequestId('search');
  let requestCompleted = false;
  let searchCriteriaProcessor = null;
  let resolvedSearchScope = searchScope;
  let resolvedSearchCriteria = null;
  let searchAgain = false;
  let warnings = [];
  let estimate = 0;
  let results = [];

  try {
    if (xdmp.traceEnabled(traceName)) {
      // Not associated with monitoring tests or the log mining script.
      xdmp.trace(
        traceName,
        `Search ${requestId} parameters: ${JSON.stringify({
          searchCriteria,
          searchScope: resolvedSearchScope,
          mayChangeScope,
          page,
          pageLength,
          requestContext,
          mayExceedMaximumPageLength,
          mayEstimate,
          sortDelimitedStr,
          filterResults,
          facetsSoon,
          synonymsEnabled,
        })}`
      );
    }

    // Validate pagination parameters, conditionally imposing a maximum page length.
    utils.checkPaginationParameters(page, pageLength);
    if (mayExceedMaximumPageLength !== true) {
      pageLength = Math.min(pageLength, MAXIMUM_PAGE_LENGTH);
    }

    // Parse sort and move any warnings to the search requests warnings.
    const sortCriteria = new SortCriteria(sortDelimitedStr);
    if (sortCriteria.hasWarnings()) {
      warnings = warnings.concat(sortCriteria.getWarnings());
    }

    // Parse gets us all the way through query generation.
    const facetsAreLikely = facetsSoon;
    searchCriteriaProcessor = processSearchCriteria({
      searchCriteria,
      searchScope: resolvedSearchScope,
      page,
      pageLength,
      sortCriteria,
      filterResults,
      synonymsEnabled,
      facetsAreLikely,
      stopWatch,
      valuesOnly,
    });
    resolvedSearchScope = searchCriteriaProcessor.getSearchScope();
    resolvedSearchCriteria = searchCriteriaProcessor.getSearchCriteria();

    // When evaluated as follows, need to convert the return to an array and take the first item.
    results = searchCriteriaProcessor.getSearchResults();
    stopWatch.lap('search');

    // When the requested scope has zero results and we're allowed to change the scope, do so.
    if (
      results.length == 0 &&
      mayChangeScope &&
      isUserInterfaceSearchScopeName(resolvedSearchScope)
    ) {
      const names = getOrderedUserInterfaceSearchScopeNames();
      for (let i = 0; i < names.length; i++) {
        const candidateSearchScopeName = names[i];
        const candidateSearchScopeObj = getSearchScope(
          candidateSearchScopeName
        );
        const estimate = _calculateEstimate(
          searchCriteriaProcessor,
          candidateSearchScopeObj
        );
        stopWatch.addTo('estimates');

        if (estimate > 0) {
          searchAgain = true;
          resolvedSearchScope = candidateSearchScopeName;
          if (xdmp.traceEnabled(traceName)) {
            // Not associated with monitoring tests or the log mining script.
            xdmp.trace(
              traceName,
              `Changed search request ${requestId}'s scope from '${searchScope}' to '${resolvedSearchScope}'`
            );
          }
          return _search(
            {
              searchCriteria,
              searchScope: resolvedSearchScope,
              mayChangeScope: false, // avoid recursion when the unfiltered count is greater than the filtered count.
              page,
              pageLength,
              filterResults,
              requestContext,
              mayExceedMaximumPageLength,
              mayEstimate: true,
              sortDelimitedStr,
              facetsSoon,
              synonymsEnabled,
              valuesOnly,
            },
            true
          );
        }
      }
    }

    if (results.length > 0 && mayEstimate) {
      estimate = _getCurrentRequestEstimate(
        searchCriteriaProcessor,
        page,
        pageLength,
        results.length
      );
      stopWatch.addTo('estimates');
    }
    // Prepare response
    const response = {
      '@context': LUX_CONTEXT,
      id: utils.buildSearchUri({
        searchCriteria: resolvedSearchCriteria,
        scope: resolvedSearchScope,
        mayChangeScope,
        page,
        pageLength,
        sortDelimitedStr,
        facetsSoon,
        synonymsEnabled,
      }),
      type: AS_TYPE_ORDERED_COLLECTION_PAGE,
      partOf: [
        {
          id: utils.buildSearchEstimateUri(
            resolvedSearchCriteria,
            resolvedSearchScope
          ),
          type: AS_TYPE_ORDERED_COLLECTION,
          // CHANGE IF MORE THAN ONE LANGUAGE IS SUPPORTED
          label: { en: [SCOPE_LABELS[resolvedSearchScope]] },
          // CHANGE IF MORE THAN ONE LANGUAGE IS SUPPORTED
          summary: {
            en: [
              utils.buildScopeDescription(
                SCOPE_DESCRIPTORS[resolvedSearchScope]
              ),
            ],
          },
          totalItems: estimate,
        },
      ],
      orderedItems: results,
    };
    if (page > 1) {
      response.prev = {
        id: utils.buildSearchUri({
          searchCriteria: resolvedSearchCriteria,
          scope: resolvedSearchScope,
          mayChangeScope,
          page: page - 1,
          pageLength,
          sortDelimitedStr,
          facetsSoon,
          synonymsEnabled,
        }),
        type: AS_TYPE_ORDERED_COLLECTION_PAGE,
      };
    }
    if (page < Math.ceil(estimate / pageLength)) {
      response.next = {
        id: utils.buildSearchUri({
          searchCriteria: resolvedSearchCriteria,
          scope: resolvedSearchScope,
          mayChangeScope,
          page: page + 1,
          pageLength,
          sortDelimitedStr,
          facetsSoon,
          synonymsEnabled,
        }),
        type: AS_TYPE_ORDERED_COLLECTION_PAGE,
      };
    }

    requestCompleted = true;

    // Serve the response up.
    return response;
  } catch (e) {
    if (xdmp.traceEnabled(traceName)) {
      // Not associated with monitoring tests or the log mining script.
      xdmp.trace(
        traceName,
        `Search ${requestId} errored out: ${JSON.stringify(e)}`
      );
    }
    throw e;
  } finally {
    if (!searchAgain && (xdmp.traceEnabled(traceName) || !requestCompleted)) {
      // Log mining script matches on a portion(s) of this message.
      const searchInfo = {
        requestId,
        requestCompleted,
        milliseconds: {
          total: stopWatch.stop(),
          ...stopWatch.lapsToObject(),
        },
        estimate: estimate,
        page,
        pageLength,
        filterResults,
        requestContext,
        returned: results.length,
        scope: resolvedSearchScope,
        changedScope,
        criteria: resolvedSearchCriteria
          ? resolvedSearchCriteria
          : searchCriteria,
        ignoredTerms: searchCriteriaProcessor
          ? searchCriteriaProcessor.getIgnoredTerms()
          : null,
        query: searchCriteriaProcessor
          ? searchCriteriaProcessor.getCtsQueryStr(true)
          : null,
      };
      xdmp.trace(traceName, searchInfo);

      // Grep friendlier
      if (requestCompleted) {
        // Log mining script matches on then parses this message.
        xdmp.trace(
          traceName,
          `requestId: ${requestId}; requestContext: ${requestContext}; filterResults: ${filterResults}; totalElapsed: ${stopWatch.totalElapsed()}; searchElapsed: ${stopWatch.lapElapsed(
            'search'
          )}; estimate: ${estimate}; returned: ${
            results.length
          }; scope: [${resolvedSearchScope}]; searchCriteria: [${
            resolvedSearchCriteria
              ? JSON.stringify(resolvedSearchCriteria)
              : searchCriteria
          }]`
        );
      }
    }
  }
}

/**
 * Processes the provided search criteria, returning an instance of SearchCriteriaProcessor from which a
 * generated CTS query may be retrieved.  An InternalServerError or InvalidSearchRequestError may be bubbled up from
 * SearchCriteriaProcessor.
 */
function processSearchCriteria({
  searchCriteria = null,
  searchScope = null,
  allowMultiScope = DEFAULT_ALLOW_MULTI_SCOPE,
  searchPatternOptions = null,
  includeTypeConstraint = DEFAULT_INCLUDE_TYPE_CONSTRAINT,
  page = DEFAULT_PAGE,
  pageLength = DEFAULT_PAGE_LENGTH,
  sortCriteria = new SortCriteria(EMPTY_STRING),
  filterResults = DEFAULT_FILTER_RESULTS_NO_CONTEXT, // Context should provide default
  synonymsEnabled = DEFAULT_SYNONYMS_ENABLED,
  facetsAreLikely = DEFAULT_FACETS_ARE_LIKELY,
  stopWatch = new StopWatch(true),
  valuesOnly = DEFAULT_VALUES_ONLY,
}) {
  const searchCriteriaProcessor = new SearchCriteriaProcessor(
    filterResults,
    facetsAreLikely,
    synonymsEnabled
  );
  searchCriteriaProcessor.process(
    searchCriteria,
    searchScope,
    allowMultiScope,
    searchPatternOptions,
    includeTypeConstraint,
    page,
    pageLength,
    sortCriteria,
    valuesOnly
  );
  stopWatch.lap('process');
  return searchCriteriaProcessor;
}

function _getCurrentRequestEstimate(
  searchCriteriaProcessor,
  page,
  pageLength,
  currentPageResultCount
) {
  // If the current page's result count is less than the page length, we can now determine the exact number of results.
  if (currentPageResultCount > 0 && pageLength > currentPageResultCount) {
    return (page - 1) * pageLength + currentPageResultCount;
  }
  // Else, we need to calculate.
  return searchCriteriaProcessor.getEstimate();
}

// Calculate an estimate for the specified scope.
function _calculateEstimate(searchCriteriaProcessor, searchScopeObj) {
  return cts.estimate(
    SearchCriteriaProcessor.evalQueryString(
      searchCriteriaProcessor.resolveTokens(
        searchScopeObj.fields,
        searchScopeObj.predicates,
        searchScopeObj.types
      )
    )
  );
}

function calculateEstimate(searchCriteria, scope) {
  const searchCriteriaProcessor = processSearchCriteria({
    searchCriteria,
    searchScope: scope,
    filterResults: false,
  });
  const searchScope = searchCriteriaProcessor.getSearchScope();
  const totalItems = searchCriteriaProcessor.getEstimate();
  const resolvedSearchCriteria = searchCriteriaProcessor.getSearchCriteria();
  const orderedCollection = {
    id: utils.buildSearchEstimateUri(resolvedSearchCriteria, searchScope),
    type: AS_TYPE_ORDERED_COLLECTION,
    label: { en: [SCOPE_LABELS[searchScope]] },
    summary: {
      en: [utils.buildScopeDescription(SCOPE_DESCRIPTORS[searchScope])],
    },
    totalItems,
    first: {
      id: utils.buildSearchUri({
        searchCriteria: resolvedSearchCriteria,
        page: 1,
        pageLength: DEFAULT_PAGE_LENGTH,
        scope: searchScope,
      }),
      type: AS_TYPE_ORDERED_COLLECTION_PAGE,
    },
    last: {
      id: utils.buildSearchUri({
        searchCriteria: resolvedSearchCriteria,
        page: Math.ceil(totalItems / DEFAULT_PAGE_LENGTH),
        pageLength: DEFAULT_PAGE_LENGTH,
        scope: searchScope,
      }),
      type: AS_TYPE_ORDERED_COLLECTION_PAGE,
    },
  };
  return orderedCollection;
}

function getSearchEstimate(searchCriteria, scope) {
  try {
    const stopWatch = new StopWatch(true);
    const estimate = calculateEstimate(searchCriteria, scope);
    const timeElapsed = stopWatch.stop();
    if (xdmp.traceEnabled(traceName)) {
      // Log mining script matches on a portion(s) of this message.
      xdmp.trace(
        traceName,
        `Calculated estimate in ${timeElapsed} milliseconds.`
      );
    }
    return {
      '@context': LUX_CONTEXT,
      ...estimate,
    };
  } catch (e) {
    if (xdmp.traceEnabled(traceName)) {
      if (isInvalidSearchRequestError(e)) {
        // Not associated to a monitoring test or the log mining script.
        xdmp.trace(
          traceName,
          `Unable to calculate an estimate due to an invalid search request.`
        );
      } else {
        // Monitoring test and log mining script checks for "Search Estimate errored out".
        xdmp.trace(
          traceName,
          `Search Estimate errored out: ${JSON.stringify({
            exception: utils.getExceptionObjectElseMessage(e),
            scope,
            searchCriteria,
          })}`
        );
      }
    }
    throw e;
  }
}

// Only supports JSON-formatted search criteria.
function determineIfSearchWillMatch(multipleSearchCriteria) {
  try {
    const start = new Date();

    // Support an object of named searches or a single, unnamed one.
    const searchScopeName = multipleSearchCriteria._scope;
    if (searchScopeName) {
      multipleSearchCriteria = { unnamed: multipleSearchCriteria };
    }

    const namedSearchesResponse = {};
    Object.keys(multipleSearchCriteria).forEach((name) => {
      const criteria = multipleSearchCriteria[name];
      try {
        const stopWatch = new StopWatch(true);

        // If a related list, we need to make the determination without cts.search.
        let hasOneOrMoreResult;
        const relatedListSearchInfo = getRelatedListSearchInfo(criteria);
        if (relatedListSearchInfo.isRelatedList) {
          hasOneOrMoreResult =
            getRelatedList({
              searchScopeName: relatedListSearchInfo.scopeName,
              relatedListName: relatedListSearchInfo.termName,
              uri: relatedListSearchInfo.uri,
              page: 1,
              pageLength: 2, // 1st may be self (uri)
              filterResults: true,
              relationshipsPerRelation: 2, // 1st may be self (uri)
              onlyCheckForOneRelatedItem: true,
            }).orderedItems.length > 0
              ? 1
              : 0;
        } else {
          // Given pagination parameters, 0 or 1 is expected.
          hasOneOrMoreResult = processSearchCriteria({
            searchCriteria: criteria,
            page: 1,
            pageLength: 1,
            filterResults: true,
            stopWatch,
          }).getSearchResults().length;
        }

        namedSearchesResponse[name] = {
          hasOneOrMoreResult,
          isRelatedList: relatedListSearchInfo.isRelatedList,
          duration: stopWatch.stop(),
        };
      } catch (e) {
        namedSearchesResponse[name] = {
          hasOneOrMoreResult: -1, // -1 indicates error
        };

        if (xdmp.traceEnabled(traceName)) {
          if (isInvalidSearchRequestError(e)) {
            // Not associated to a monitoring test or the log mining script.
            xdmp.trace(
              traceName,
              `Unable to determine if the '${name}' search will match due to an invalid search request.`
            );
          } else {
            // Monitoring test and log mining script checks for "Search Will Match errored out".
            xdmp.trace(
              traceName,
              `A search named '${name}' given to Search Will Match errored out: ${JSON.stringify(
                { exception: utils.getExceptionObjectElseMessage(e), criteria }
              )}`
            );
          }
        }
      }
    });

    if (xdmp.traceEnabled(traceName)) {
      // Log mining script matches on a portion(s) of this message.
      xdmp.trace(
        traceName,
        `Checked ${Object.keys(namedSearchesResponse).length} searches in ${
          new Date().getTime() - start.getTime()
        } milliseconds.`
      );
    }

    return namedSearchesResponse;
  } catch (e) {
    if (xdmp.traceEnabled(traceName)) {
      // Monitoring test and log mining script checks for "Search Will Match errored out".
      xdmp.trace(
        traceName,
        `Search Will Match errored out: ${JSON.stringify({
          exception: utils.getExceptionObjectElseMessage(e),
          multipleSearchCriteria,
        })}`
      );
    }
    throw e;
  }
}

// Bring back if synonym support is restored.
//
// // Returns a stringified array of search options.
// function getSearchOptions(synonymsEnabled) {
//   return synonymsEnabled === true
//     ? DEFAULT_SEARCH_OPTIONS_SYNONYMS
//     : DEFAULT_SEARCH_OPTIONS_KEYWORD;
// }

// Returns an array of search options starting from an options or pattern name.
//
// At present, an options name must be provided or derived to get a non-null response.  Further,
// only the keyword search options are overridable.  Please extend if not sufficient.
function resolveSearchOptions(
  optionsName = null,
  patternName = null,
  requestOverridesArr = [],
  instanceOverridesArr = {}
) {
  optionsName = resolveSearchOptionsName(optionsName, patternName);
  if (SEARCH_OPTIONS_NAME_EXACT == optionsName) {
    return DEFAULT_SEARCH_OPTIONS_EXACT;
  } else if (optionsName == SEARCH_OPTIONS_NAME_KEYWORD) {
    // Instance options override request options which override the defaults.
    return _mergeSearchOptions(
      _mergeSearchOptions(DEFAULT_SEARCH_OPTIONS_KEYWORD, requestOverridesArr),
      instanceOverridesArr
    );
  }
  if (optionsName) {
    console.warn(
      `The '${optionsName}' search options reference is unknown. Please check the search criteria configuration. Using null.`
    );
  }
  return null;
}

function resolveSearchOptionsName(optionsName = null, patternName = null) {
  return optionsName
    ? optionsName
    : getDefaultSearchOptionsNameByPatternName(patternName);
}

function _mergeSearchOptions(defaultOptionsArr, overrideOptionsArr) {
  if (utils.isNonEmptyArray(overrideOptionsArr)) {
    // If the exact option is specified, that's all we need to know.
    if (overrideOptionsArr.includes('exact')) {
      return DEFAULT_SEARCH_OPTIONS_EXACT;
    }

    // Else, let's go through each override, replacing the associated default.
    let mergedOptionsArr = defaultOptionsArr;
    overrideOptionsArr.forEach((searchOption) => {
      if (SEARCH_OPTIONS_INVERSE_MAP.hasOwnProperty(searchOption)) {
        // The default option need not be present for the override to be added.
        mergedOptionsArr = utils.replaceValueInArray(
          mergedOptionsArr,
          SEARCH_OPTIONS_INVERSE_MAP[searchOption],
          searchOption
        );
      } else {
        console.log(
          `Ignoring an unrecognized search term option of '${searchOption}'.`
        );
      }
    });
    return mergedOptionsArr;
  }
  return defaultOptionsArr;
}

// Bring back if synonym support is restored.
//
// /**
//  * Returns a word query, as a string.
//  *
//  * @param {Object} criterion - The associated search criterion.  Only use is to add the synonyms such that
//  *        they may be included in the search response body.
//  * @param {String} wordQueryType - The type of word query.  Needs to be a value that can be plugged into
//  *        the name of a native CTS word query function (cts.*WordQuery), such as 'jsonProperty' and 'field'.
//  * @param {Array} namesArr - Property, field, etc. names.  Must align with the specified word query type.
//  * @param {String} term - The word or phrase to search for.
//  * @param {Boolean} synonymsEnabled - Submit true to also accept synonyms of the specified term.
//  * @returns {String} A CTS query, as a string.  May be a cts.orQuery when synonymsEnabled is true.
//  */
// function _wordQueryWithSynonyms(
//   criterion,
//   wordQueryType,
//   namesArr,
//   term,
//   synonymsEnabled
// ) {
//   let query = null;
//   let synonyms = null;
//   if (synonymsEnabled) {
//     // Be sure to lowercase the term
//     const lookupResult = lookup(
//       THESAURUS_URIS,
//       term.toLowerCase ? term.toLowerCase() : term,
//       'objects'
//     );
//     if (!fn.empty(lookupResult)) {
//       const results = JSON.parse(lookupResult).synonyms;
//       if (results) {
//         synonyms = [];
//         results.forEach((item) => {
//           if (term != item.term) {
//             synonyms.push(item.term);
//           }
//         });
//         if (synonyms.length > 0) {
//           query = `cts.orQuery([
//             cts.${wordQueryType}WordQuery(${utils.arrayToString(
//             namesArr
//           )}, "${term}", ${utils.arrayToString(getSearchOptions(false))}),
//             cts.${wordQueryType}WordQuery(
//               ${utils.arrayToString(namesArr)},
//               ${utils.arrayToString(synonyms)},
//               ${utils.arrayToString(getSearchOptions(true))},
//               ${SYNONYM_WEIGHT}
//             ),
//           ])`;
//         }
//       }
//     }
//     criterion.synonyms = synonyms;
//   }
//   if (!query) {
//     query = `cts.${wordQueryType}WordQuery(${utils.arrayToString(
//       namesArr
//     )}, "${term}", ${utils.arrayToString(getSearchOptions(false))})`;
//   }

//   return query;
// }

const WILDCARD_CHARS = '*?';
const WILDCARD_CHAR_REGEX = new RegExp(`[${WILDCARD_CHARS}]`);
const QUALIFYING_CHARS = '\\s\\-';
const QUALIFYING_CHARS_REGEX = new RegExp(`[${QUALIFYING_CHARS}]`);
const MINIMUM_QUALIFYING_CHAR_COUNT = 3;
const QUALIFYING_WILDCARD_REGEX = new RegExp(
  `([${WILDCARD_CHARS}][^${WILDCARD_CHARS}${QUALIFYING_CHARS}]{${MINIMUM_QUALIFYING_CHAR_COUNT},})|([^${WILDCARD_CHARS}${QUALIFYING_CHARS}]{${MINIMUM_QUALIFYING_CHAR_COUNT},}[${WILDCARD_CHARS}])`
);
function _hasInvalidWildcardCriteria(str) {
  const pieces = str.split(QUALIFYING_CHARS_REGEX);
  for (let i = 0; i < pieces.length; i++) {
    if (
      WILDCARD_CHAR_REGEX.test(pieces[i]) &&
      !QUALIFYING_WILDCARD_REGEX.test(pieces[i])
    ) {
      return true;
    }
  }
  return false;
}
// Whenever an asterisk touches another wildcard character, convert to a single asterisk.
const WILDCARDS_TO_CONSOLIDATE_REGEX = new RegExp('([?*]+[*])|([*][?*]+)');
function _consolidateApplicableWildcards(str) {
  let matches;
  while ((matches = str.match(WILDCARDS_TO_CONSOLIDATE_REGEX))) {
    str = str.replace(matches[0], '*');
  }
  return str;
}
// After consolidating applicable wildcards, validate there is no invalid wildcard criteria.
// strArr may be a string or array of strings; the given type will be returned.
// Each string may be a word or phrase.
// The value of strArr can be modified; caller to update their variable to this function's return,
// providing caller wants the cleaned up value(s).
function sanitizeAndValidateWildcardedStrings(strOrArr) {
  if (strOrArr) {
    const returnOneValue = !utils.isArray(strOrArr);
    if (returnOneValue) {
      strOrArr = [strOrArr];
    }
    for (let i = 0; i < strOrArr.length; i++) {
      const origValue = strOrArr[i] + '';
      strOrArr[i] = _consolidateApplicableWildcards(origValue.trim());
      if (_hasInvalidWildcardCriteria(strOrArr[i])) {
        let msg = `wildcarded strings must have at least three non-wildcard characters before or after the wildcard; '${origValue}' does not qualify`;
        if (origValue != strOrArr[i]) {
          msg += `, even after adjusting to '${strOrArr[i]}'`;
        }
        throw new InvalidSearchRequestError(msg);
      }
    }
    if (returnOneValue) {
      strOrArr = strOrArr[0];
    }
  }
  return strOrArr;
}

export {
  determineIfSearchWillMatch,
  getSearchEstimate,
  resolveSearchOptions,
  resolveSearchOptionsName,
  processSearchCriteria,
  sanitizeAndValidateWildcardedStrings,
  search,
  TOKEN_FIELDS,
  TOKEN_PREDICATES,
  TOKEN_TYPES,
};
