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
  TRACE_NAME_SEARCH as traceName,
} from './appConstants.mjs';
import * as utils from '../utils/utils.mjs';
import { SearchCriteriaProcessor as SCP } from './SearchCriteriaProcessor.mjs';
import { getDefaultSearchOptionsNameByPatternName } from './search/patterns.mjs';
import {
  InvalidSearchRequestError,
  isInvalidSearchRequestError,
} from './errorClasses.mjs';
import {
  getRelatedList,
  getRelatedListSearchInfo,
} from './relatedListsLib.mjs';

const MAXIMUM_PAGE_LENGTH = 100;

const EMPTY_STRING = '';
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_LENGTH = 20;
const DEFAULT_REQUEST_CONTEXT = 'unspecified';
const DEFAULT_MAY_EXCEED_MAXIMUM_PAGE_LENGTH = false;
const DEFAULT_FACETS_SOON = false;
const DEFAULT_FACETS_ARE_LIKELY = DEFAULT_FACETS_SOON;

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
  page = DEFAULT_PAGE,
  pageLength = DEFAULT_PAGE_LENGTH,
  pageWith = null,
  requestContext = DEFAULT_REQUEST_CONTEXT,
  mayExceedMaximumPageLength = DEFAULT_MAY_EXCEED_MAXIMUM_PAGE_LENGTH,
  sortDelimitedStr = EMPTY_STRING,
  filterResults = DEFAULT_FILTER_SEARCH_RESULTS,
}) {
  return _search(
    {
      searchCriteria,
      searchScope,
      page,
      pageLength,
      pageWith,
      requestContext,
      mayExceedMaximumPageLength,
      sortDelimitedStr,
      filterResults,
    },
    false,
  );
}

// Private.  May call itself upon changing the search scope.
function _search(
  {
    searchCriteria = null,
    searchScope = null,
    page = DEFAULT_PAGE,
    pageLength = DEFAULT_PAGE_LENGTH,
    pageWith = null,
    requestContext = DEFAULT_REQUEST_CONTEXT,
    mayExceedMaximumPageLength = DEFAULT_MAY_EXCEED_MAXIMUM_PAGE_LENGTH,
    sortDelimitedStr = EMPTY_STRING,
    filterResults = DEFAULT_FILTER_SEARCH_RESULTS,
  },
  changedScope = false,
) {
  const stopWatch = new StopWatch(true);
  const requestId = utils.assignRequestId('search');
  let requestCompleted = false;
  let scp = null;
  let resolvedSearchScope = searchScope;
  let resolvedSearchCriteria = null;
  let searchAgain = false;
  let estimate = 0;
  let results = [];
  let resultPage = 1;

  try {
    if (xdmp.traceEnabled(traceName)) {
      // Not associated with monitoring tests or the log mining script.
      xdmp.trace(
        traceName,
        `Search ${requestId} parameters: ${JSON.stringify({
          searchCriteria,
          searchScope: resolvedSearchScope,
          page,
          pageLength,
          pageWith,
          requestContext,
          mayExceedMaximumPageLength,
          sortDelimitedStr,
          filterResults,
        })}`,
      );
    }

    // Validate pagination parameters, conditionally imposing a maximum page length.
    utils.checkPaginationParameters(page, pageLength);
    if (mayExceedMaximumPageLength !== true) {
      pageLength = Math.min(pageLength, MAXIMUM_PAGE_LENGTH);
    }

    // Parse gets us all the way through query generation.
    scp = new SCP();
    scp.prepare({
      searchCriteria,
      scopeName: resolvedSearchScope,
      page,
      pageLength,
      pageWith,
      sortDelimitedStr,
      filterResults,
    });
    stopWatch.lap('process');
    resolvedSearchScope = scp.getSearchScope();
    resolvedSearchCriteria = scp.getSearchCriteria();

    // Execute the search
    const searchExecutionResponse = scp.execute();
    results = searchExecutionResponse.getSearchResults();
    resultPage = searchExecutionResponse.getResultPage();
    estimate = searchExecutionResponse.getTotal();
    stopWatch.lap('search');

    // Prepare response
    const response = {
      '@context': LUX_CONTEXT,
      id: utils.buildSearchUri({
        searchCriteria: resolvedSearchCriteria,
        scope: resolvedSearchScope,
        page: resultPage,
        pageLength,
        sortDelimitedStr,
      }),
      type: AS_TYPE_ORDERED_COLLECTION_PAGE,
      partOf: [
        {
          id: utils.buildSearchEstimateUri(
            resolvedSearchCriteria,
            resolvedSearchScope,
          ),
          type: AS_TYPE_ORDERED_COLLECTION,
          // CHANGE IF MORE THAN ONE LANGUAGE IS SUPPORTED
          label: { en: [SCOPE_LABELS[resolvedSearchScope]] },
          // CHANGE IF MORE THAN ONE LANGUAGE IS SUPPORTED
          summary: {
            en: [
              utils.buildScopeDescription(
                SCOPE_DESCRIPTORS[resolvedSearchScope],
              ),
            ],
          },
          totalItems: estimate,
        },
      ],
      orderedItems: results,
    };
    if (resultPage > 1) {
      response.prev = {
        id: utils.buildSearchUri({
          searchCriteria: resolvedSearchCriteria,
          scope: resolvedSearchScope,
          page: resultPage - 1,
          pageLength,
          sortDelimitedStr,
        }),
        type: AS_TYPE_ORDERED_COLLECTION_PAGE,
      };
    }
    if (resultPage < Math.ceil(estimate / pageLength)) {
      response.next = {
        id: utils.buildSearchUri({
          searchCriteria: resolvedSearchCriteria,
          scope: resolvedSearchScope,
          page: resultPage + 1,
          pageLength,
          sortDelimitedStr,
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
        `Search ${requestId} errored out: ${JSON.stringify(e)}`,
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
        pageWith,
        filterResults,
        requestContext,
        returned: results.length,
        scope: resolvedSearchScope,
        changedScope,
        criteria: resolvedSearchCriteria
          ? resolvedSearchCriteria
          : searchCriteria,
        ignoredTerms: scp
          ? scp.getIgnoredTerms()
          : null,
        query: scp
          ? scp.getQueryStr()
          : null,
      };
      xdmp.trace(traceName, searchInfo);

      // Grep friendlier
      if (requestCompleted) {
        // Log mining script matches on then parses this message.
        xdmp.trace(
          traceName,
          `requestId: ${requestId}; requestContext: ${requestContext}; filterResults: ${filterResults}; totalElapsed: ${stopWatch.totalElapsed()}; searchElapsed: ${stopWatch.lapElapsed(
            'search',
          )}; estimate: ${estimate}; returned: ${
            results.length
          }; scope: [${resolvedSearchScope}]; searchCriteria: [${
            resolvedSearchCriteria
              ? JSON.stringify(resolvedSearchCriteria)
              : searchCriteria
          }]`,
        );
      }
    }
  }
}

function calculateEstimate(searchCriteria, scope) {
  const scp = new SCP();
  scp.prepare({
    searchCriteria,
    scopeName: scope,
    filterResults: false,
  });
  const searchScope = scp.getSearchScope();
  const totalItems = scp.getEstimate();
  const resolvedSearchCriteria = scp.getSearchCriteria();
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
        `Calculated estimate in ${timeElapsed} milliseconds.`,
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
          `Unable to calculate an estimate due to an invalid search request.`,
        );
      } else {
        // Monitoring test and log mining script checks for "Search Estimate errored out".
        xdmp.trace(
          traceName,
          `Search Estimate errored out: ${JSON.stringify({
            exception: utils.getExceptionObjectElseMessage(e),
            scope,
            searchCriteria,
          })}`,
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
          const results = new SCP()
            .prepare({
              searchCriteria: criteria,
              page: 1,
              pageLength: 1,
              filterResults: true,
            })
            .execute()
            .getSearchResults();
          hasOneOrMoreResult = results.length;
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
              `Unable to determine if the '${name}' search will match due to an invalid search request.`,
            );
          } else {
            // Monitoring test and log mining script checks for "Search Will Match errored out".
            xdmp.trace(
              traceName,
              `A search named '${name}' given to Search Will Match errored out: ${JSON.stringify(
                { exception: utils.getExceptionObjectElseMessage(e), criteria },
              )}`,
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
        } milliseconds.`,
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
        })}`,
      );
    }
    throw e;
  }
}

// Returns an array of search options starting from an options or pattern name.
//
// At present, an options name must be provided or derived to get a non-null response.  Further,
// only the keyword search options are overridable.  Please extend if not sufficient.
function resolveSearchOptions(
  optionsName = null,
  patternName = null,
  requestOverridesArr = [],
  instanceOverridesArr = {},
) {
  optionsName = resolveSearchOptionsName(optionsName, patternName);
  if (SEARCH_OPTIONS_NAME_EXACT == optionsName) {
    return DEFAULT_SEARCH_OPTIONS_EXACT;
  } else if (optionsName == SEARCH_OPTIONS_NAME_KEYWORD) {
    // Instance options override request options which override the defaults.
    return _mergeSearchOptions(
      _mergeSearchOptions(DEFAULT_SEARCH_OPTIONS_KEYWORD, requestOverridesArr),
      instanceOverridesArr,
    );
  }
  if (optionsName) {
    console.warn(
      `The '${optionsName}' search options reference is unknown. Please check the search criteria configuration. Using null.`,
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
          searchOption,
        );
      } else {
        console.log(
          `Ignoring an unrecognized search term option of '${searchOption}'.`,
        );
      }
    });
    return mergedOptionsArr;
  }
  return defaultOptionsArr;
}

const WILDCARD_CHARS = '*?';
const WILDCARD_CHAR_REGEX = new RegExp(`[${WILDCARD_CHARS}]`);
const QUALIFYING_CHARS = '\\s\\-';
const QUALIFYING_CHARS_REGEX = new RegExp(`[${QUALIFYING_CHARS}]`);
const MINIMUM_QUALIFYING_CHAR_COUNT = 3;
const QUALIFYING_WILDCARD_REGEX = new RegExp(
  `([${WILDCARD_CHARS}][^${WILDCARD_CHARS}${QUALIFYING_CHARS}]{${MINIMUM_QUALIFYING_CHAR_COUNT},})|([^${WILDCARD_CHARS}${QUALIFYING_CHARS}]{${MINIMUM_QUALIFYING_CHAR_COUNT},}[${WILDCARD_CHARS}])`,
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
  sanitizeAndValidateWildcardedStrings,
  search,
};
