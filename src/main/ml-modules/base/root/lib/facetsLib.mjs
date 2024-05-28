import { FACETS_CONFIG } from '../config/facetsConfig.mjs';
import { SEARCH_TERM_CONFIG } from '../../config/searchTermConfig.mjs';
import { SearchCriteriaProcessor } from './SearchCriteriaProcessor.mjs';
import {
  AS_TYPE_ORDERED_COLLECTION,
  AS_TYPE_ORDERED_COLLECTION_PAGE,
  FACET_MAXIMUM_PRODUCT,
  LUX_CONTEXT,
  TRACE_NAME_FACETS as traceName,
  VIA_SEARCH_FACET_TIMEOUT,
} from './appConstants.mjs';
import { processSearchCriteria, search } from './searchLib.mjs';
import { getFieldRangeIndexCountIRI } from './dataConstants.mjs';
import * as utils from '../utils/utils.mjs';
import { BadRequestError } from './mlErrorsLib.mjs';
import { FACETS_VIA_SEARCH_CONFIG } from '../config/facetsViaSearchConfig.mjs';
import { facetToScopeAndTermName } from '../utils/searchTermUtils.mjs';

// Pagination constants
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_LENGTH = 20;
const MAXIMUM_PAGE_LENGTH = 100;

function getFacets({
  name,
  searchCriteria = null,
  searchScope = null,
  page = DEFAULT_PAGE,
  pageLength = DEFAULT_PAGE_LENGTH,
}) {
  const start = new Date();
  let requestCompleted = false;

  try {
    // Validate pagination parameters (and impose a maximum number per request).
    pageLength = Math.min(pageLength, MAXIMUM_PAGE_LENGTH);
    utils.checkPaginationParameters(page, pageLength);

    const searchCriteriaProcessor = searchCriteria
      ? processSearchCriteria({
          searchCriteria,
          searchScope,
        })
      : null;

    // Get the raw facet values and value counts.
    let facetValues = null;
    if (_isSemanticFacet(name)) {
      xdmp.setRequestTimeLimit(VIA_SEARCH_FACET_TIMEOUT);
      facetValues = _getViaSearchFacets(name, searchCriteriaProcessor);
    } else {
      facetValues = _getNonSemanticFacets(
        name,
        searchCriteriaProcessor,
        page,
        pageLength
      );
    }

    // Format as Activity Streams
    facetValues = _getFacetsResponse(
      facetValues,
      name,
      searchCriteriaProcessor
    );

    requestCompleted = true;
    return facetValues;
  } finally {
    const duration = new Date().getTime() - start.getTime();
    if (requestCompleted) {
      xdmp.trace(
        traceName,
        `Calculated the following facets in ${duration} milliseconds: ${name}`
      );
    } else {
      xdmp.trace(
        traceName,
        `Failed to calculate the following facets after ${duration} milliseconds: ${name}`
      );
    }
  }
}

function _getFacetsResponse(facets, name, searchCriteriaProcessor) {
  const searchCriteria = searchCriteriaProcessor.getSearchCriteria();
  const scope = searchCriteriaProcessor.getSearchScope();
  const orderedItems = facets.map((facet) => {
    const { count, value } = facet;
    const facetSearchCriteria = _getFacetSearchCriteria(
      searchCriteria,
      name,
      value
    );
    return {
      id: utils.buildSearchEstimateUri(facetSearchCriteria, scope),
      type: AS_TYPE_ORDERED_COLLECTION,
      totalItems: count,
      first: {
        id: utils.buildSearchUri({
          searchCriteria: facetSearchCriteria,
          scope,
        }),
        type: AS_TYPE_ORDERED_COLLECTION_PAGE,
      },
      value,
    };
  });
  return {
    '@context': LUX_CONTEXT,
    id: utils.buildFacetsUri(searchCriteria, scope, name),
    type: AS_TYPE_ORDERED_COLLECTION_PAGE,
    orderedItems,
  };
}

function _isSemanticFacet(name) {
  if (FACETS_CONFIG[name]) {
    return false;
  } else if (FACETS_VIA_SEARCH_CONFIG[name]) {
    return true;
  } else {
    throw new BadRequestError(
      `Unable to calculate the '${name}' facet: not an available facet.`
    );
  }
}

// Support presently limited to field range indexes.
function _getNonSemanticFacets(
  facetName,
  searchCriteriaProcessor,
  page,
  pageLength
) {
  const fieldValuesOptions = ['frequency-order', 'lazy', 'score-zero'];

  // Require search criteria.
  const ctsQueryStr = searchCriteriaProcessor
    ? searchCriteriaProcessor.getCtsQueryStr(false)
    : null;
  if (!utils.isNonEmptyString(ctsQueryStr)) {
    _throwSearchCriteriaRequiredError();
  }

  const ctsQuery = SearchCriteriaProcessor.evalQueryString(ctsQueryStr);

  // Tally up the number of index values this request would interact with.
  let indexValueCount = getFieldRangeIndexCountIRI(
    FACETS_CONFIG[facetName].indexReference
  );

  // Reject request if the product of the estimated number of search results and index values exceeds the threshold.
  const searchResultEstimate = parseInt(cts.estimate(ctsQuery)); // comes back as an object, which toLocaleString doesn't format
  const requestProduct = searchResultEstimate * indexValueCount;
  if (requestProduct > FACET_MAXIMUM_PRODUCT) {
    xdmp.trace(
      traceName,
      `Rejected request to calculate the ${facetName} facet as ${searchResultEstimate.toLocaleString()} search results by ${indexValueCount.toLocaleString()} field values exceeds the ${FACET_MAXIMUM_PRODUCT.toLocaleString()} threshold.`
    );
    throw new BadRequestError(
      `Threshold to calculate the ${facetName} facet exceeded.`
    );
  }

  // We're allowed to calculate the facets.
  return fn
    .subsequence(
      cts.fieldValues(
        FACETS_CONFIG[facetName].indexReference,
        null,
        fieldValuesOptions,
        ctsQuery
      ),
      utils.getStartingPaginationIndexForSubsequence(page, pageLength),
      pageLength
    )
    .toArray()
    .map((value) => ({
      value: value,
      count: cts.frequency(value),
    }));
}

function _getViaSearchFacets(facetName, searchCriteriaProcessor) {
  // Require search criteria.
  const baseSearchCriteria = searchCriteriaProcessor
    ? searchCriteriaProcessor.getSearchCriteria()
    : null;
  if (!baseSearchCriteria) {
    _throwSearchCriteriaRequiredError();
  }

  const requestOptions = searchCriteriaProcessor.getRequestOptions();

  const facetConfig = FACETS_VIA_SEARCH_CONFIG[facetName];

  /*
   * TODO: This pagination implementation has not been updated for #161.
   */
  const page = 1;
  const pageLength = MAXIMUM_PAGE_LENGTH + 1;
  const facets = _getViaSearchFacetValues(
    facetName,
    facetConfig,
    baseSearchCriteria,
    requestOptions,
    page,
    pageLength
  )
    .map((searchResult) => {
      const uri = searchResult.id + ''; // Required string conversion
      const val = {
        value: uri,
        count: _estimateViaSearchFacetValueCount(
          uri,
          facetConfig,
          baseSearchCriteria
        ),
      };
      return val;
    })
    .sort((a, b) => b.count - a.count);

  // Warn when there were more facet values than allowed.
  if (facets.length > MAXIMUM_PAGE_LENGTH) {
    console.warn(
      `The '${facetName}' facet exceeded the ${MAXIMUM_PAGE_LENGTH} value limit with base search criteria ${JSON.stringify(
        baseSearchCriteria
      )}`
    );
  }
  return facets;
}

function _getViaSearchFacetValues(
  facetName,
  facetConfig,
  baseSearchCriteria,
  requestOptions,
  page,
  pageLength
) {
  xdmp.trace(traceName, `Searching for the '${facetName}' facet values.`);
  return search({
    searchCriteria: facetConfig.getFacetValuesCriteria(baseSearchCriteria),
    page,
    pageLength,
    requestContext: 'viaSearchFacet',
    mayExceedMaximumPageLength: true,
    mayCalculateEstimates: false,
    synonymsEnabled: requestOptions.synonymsEnabled,
  }).orderedItems;
}

function _estimateViaSearchFacetValueCount(
  facetValueId,
  facetConfig,
  baseSearchCriteria
) {
  return processSearchCriteria({
    searchCriteria: facetConfig.getFacetValueCountCriteria(
      baseSearchCriteria,
      facetValueId
    ),
    includeTypeConstraint: false,
  }).getEstimate();
}

function _throwSearchCriteriaRequiredError() {
  throw new BadRequestError(`The facet request requires search criteria.`);
}

function _getFacetSearchCriteria(searchCriteria, facetName, facetValue) {
  if (FACETS_VIA_SEARCH_CONFIG[facetName]) {
    return FACETS_VIA_SEARCH_CONFIG[facetName].getFacetValueCountCriteria(
      searchCriteria,
      facetValue
    );
  } else {
    return {
      AND: [searchCriteria, _convertFacetToSearchTerm(facetName, facetValue)],
    };
  }
}

function _convertFacetToSearchTerm(facetName, facetValue) {
  let { scopeName, termName } = facetToScopeAndTermName(facetName);
  //facets ending in Id usually convert to search terms without Id
  if (termName.endsWith('Id')) {
    const termNameWithoutId = termName.substring(0, termName.length - 2);
    if (SEARCH_TERM_CONFIG[scopeName][termNameWithoutId]) {
      termName = termNameWithoutId;
    }
  }
  if (!SEARCH_TERM_CONFIG[scopeName][termName]) {
    throw new Error(`Unable to convert ${facetName} to a search term`);
  }
  const searchTermInfo = SEARCH_TERM_CONFIG[scopeName][termName];
  const { scalarType } = searchTermInfo;
  if (!scalarType) {
    return { [termName]: { id: facetValue } };
  }
  if (scalarType === 'dateTime') {
    return {
      AND: [
        { [termName]: facetValue, _comp: '>=' },
        { [termName]: facetValue, _comp: '<=' },
      ],
    };
  }
  return { [termName]: facetValue };
}

export { getFacets };
