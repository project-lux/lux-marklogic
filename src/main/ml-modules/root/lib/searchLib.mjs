import { StopWatch } from '/utils/stopWatch.mjs';
import {
  AS_TYPE_ORDERED_COLLECTION,
  AS_TYPE_ORDERED_COLLECTION_PAGE,
  DEFAULT_FILTER_SEARCH_RESULTS,
  LUX_CONTEXT,
  TRACE_NAME_SEARCH as traceName,
} from '/lib/appConstants.mjs';
import * as utils from '/utils/utils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import { InvalidSearchRequestError } from '/lib/errorClasses.mjs';
import {
  getRelatedList,
  getRelatedListSearchInfo,
} from '/lib/relatedListsLib.mjs';

const EMPTY_STRING = '';
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_LENGTH = 20;
const DEFAULT_REQUEST_CONTEXT = 'unspecified';
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
          sortDelimitedStr,
          filterResults,
        })}`,
      );
    }

    // Parse gets us all the way through query generation.
    scp = new SCP();
    scp.prepare({
      requestId,
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
    pageLength = scp.getPageLength();

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
        ignoredTerms: scp ? scp.getIgnoredTerms() : null,
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
    includeSearchResults: false,
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
      if (e instanceof InvalidSearchRequestError) {
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
          if (e instanceof InvalidSearchRequestError) {
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

export { determineIfSearchWillMatch, getSearchEstimate, search };
