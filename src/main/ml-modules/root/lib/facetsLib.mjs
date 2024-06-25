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

// A safeguard from a current or future viaSearch facet request from pulling too many documents from disk.
// Not a concern for the initial two facets but what about the next one?  As opposed to facets that pull
// their values from a field, enabling a request to pull an unlimited number of documents from disk would
// be bad.
const MAXIMUM_FACET_VALUE_VIA_SEARCH_DOCUMENTS = 100;

const FACET_TYPE_NON_SEMANTIC = 1;
const FACET_TYPE_VIA_SEARCH = 2;

// Intended for facets endpoint.
function getFacets({ name, searchCriteria = null, searchScope = null }) {
  const searchCriteriaProcessor = searchCriteria
    ? processSearchCriteria({
        searchCriteria,
        searchScope,
      })
    : null;
  return _getFacets(name, searchCriteriaProcessor, null);
}

// Core function
function _getFacets(
  name,
  searchCriteriaProcessor = null,
  searchRequestId = null
) {
  const start = new Date();
  let requestCompleted = false;

  const facetType = _getFacetType(name);
  try {
    let facets = null;

    if (facetType === FACET_TYPE_NON_SEMANTIC) {
      facets = _getNonSemanticFacets(name, searchCriteriaProcessor);
    }

    if (facetType === FACET_TYPE_VIA_SEARCH) {
      xdmp.setRequestTimeLimit(VIA_SEARCH_FACET_TIMEOUT);
      facets = _getViaSearchFacets(name, searchCriteriaProcessor);
    }

    requestCompleted = true;
    return _getFacetsResponse(facets, name, searchCriteriaProcessor);
  } finally {
    const duration = new Date().getTime() - start.getTime();
    if (requestCompleted) {
      xdmp.trace(
        traceName,
        `Calculated the following facets ${
          searchRequestId ? `for search ${searchRequestId} ` : ''
        }in ${duration} milliseconds: ${name}`
      );
    } else {
      xdmp.trace(
        traceName,
        // Monitoring test and log mining script checks for "Failed to calculate".
        `Failed to calculate the following facets ${
          searchRequestId ? `for search ${searchRequestId} ` : ''
        }after ${duration} milliseconds: ${name}`
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

function _getFacetType(name) {
  if (FACETS_CONFIG[name]) {
    return FACET_TYPE_NON_SEMANTIC;
  } else if (FACETS_VIA_SEARCH_CONFIG[name]) {
    return FACET_TYPE_VIA_SEARCH;
  } else {
    throw new BadRequestError(
      `Unable to calculate the '${name}' facet: not an available facet.`
    );
  }
}

// Support presently limited to field range indexes.
function _getNonSemanticFacets(facetName, searchCriteriaProcessor) {
  const fieldValuesOptions = ['frequency-order', 'eager'];

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
      // Monitoring test and log mining script checks for "Rejected request to calculate".
      `Rejected request to calculate the ${facetName} facet as ${searchResultEstimate.toLocaleString()} search results by ${indexValueCount.toLocaleString()} field values exceeds the ${FACET_MAXIMUM_PRODUCT.toLocaleString()} threshold.`
    );
    throw new BadRequestError(
      `Threshold to calculate the ${facetName} facet exceeded.`
    );
  }

  // We're allowed to calculate the facets.
  const facets = Array.from(
    cts.fieldValues(
      FACETS_CONFIG[facetName].indexReference,
      null,
      fieldValuesOptions,
      ctsQuery
    )
  ).map((value) => ({
    value: value,
    count: cts.frequency(value),
  }));

  return facets;
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
  const page = 1;
  const pageLength = MAXIMUM_FACET_VALUE_VIA_SEARCH_DOCUMENTS + 1;
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
  if (facets.length > MAXIMUM_FACET_VALUE_VIA_SEARCH_DOCUMENTS) {
    console.warn(
      `The '${facetName}' facet exceeded the ${MAXIMUM_FACET_VALUE_VIA_SEARCH_DOCUMENTS} value limit with base search criteria ${JSON.stringify(
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
