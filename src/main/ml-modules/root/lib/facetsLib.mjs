import { SearchCriteriaProcessor } from './SearchCriteriaProcessor.mjs';
import { FacetRequests } from './search/FacetRequests.mjs';
import { getSearchTermsConfig } from '../../config/searchTermsConfig.mjs';
import { facetToScopeAndTermName } from '../utils/searchTermUtils.mjs';
import { FACETS_CONFIG } from '../config/facetsConfig.mjs';
import { SEMANTIC_FACETS_CONFIG } from '../config/semanticFacetsConfig.mjs';
import {
  AS_TYPE_ORDERED_COLLECTION,
  AS_TYPE_ORDERED_COLLECTION_PAGE,
  LUX_CONTEXT,
  TRACE_NAME_FACETS as traceName,
} from './appConstants.mjs';
import * as utils from '../utils/utils.mjs';
import {
  BadRequestError,
  InternalServerError,
  isInvalidSearchRequestError,
} from './errorClasses.mjs';

//#region Exported functions
function getFacet({
  facetName,
  searchCriteria = null,
  scopeName = null,
  page = 1,
  pageLength = 20,
  sort = 'count', // a.k.a. frequency-order
}) {
  const start = new Date();
  let requestCompleted = false;
  let InvalidSearchRequestError = false;

  try {
    const facetRequests = new FacetRequests(page, pageLength);
    facetRequests.addFacetRequest(facetName, sort);

    console.log(
      `Passing search scope of '${scopeName}' to SearchCriteriaProcessor for facet calculation.`,
    );
    const searchCriteriaProcessor = new SearchCriteriaProcessor(false);
    const searchExecutionResult = searchCriteriaProcessor
      .prepare({
        searchCriteria,
        scopeName,
        allowMultiScope: false,
        filterResults: false,
      })
      .execute(facetRequests);

    const facetResponses = searchExecutionResult.getFacets();
    const { facetValues, totalItems } = facetResponses
      ? facetResponses.getFacet(facetName)
      : { facetValues: null, totalItems: null };

    // Format as Activity Streams
    const facetValuesAS = _getFacetResponse(
      facetName,
      facetValues,
      searchCriteriaProcessor,
      totalItems,
      page,
      pageLength,
    );
    requestCompleted = true;
    return facetValuesAS;
  } catch (e) {
    if (isInvalidSearchRequestError(e)) {
      InvalidSearchRequestError = true;
    }
    throw e;
  } finally {
    const duration = new Date().getTime() - start.getTime();
    if (requestCompleted) {
      // Log mining script checks for "Calculated the following facet".
      xdmp.trace(
        traceName,
        `Calculated the following facet in ${duration} milliseconds: ${facetName} (page: ${page}; pageLength: ${pageLength})`,
      );
    } else if (InvalidSearchRequestError) {
      // Not associated to a monitoring test or the log mining script.
      xdmp.trace(
        traceName,
        `Unable to calculate the '${facetName}' facet due to an invalid search request.`,
      );
    } else {
      // Monitoring test and log mining script checks for "Failed to calculate".
      xdmp.trace(
        traceName,
        `Failed to calculate the following facet after ${duration} milliseconds: ${facetName} (page: ${page}; pageLength: ${pageLength})`,
      );
    }
  }
}

function isSemanticFacet(facetName) {
  if (FACETS_CONFIG[facetName]) {
    return false;
  } else if (SEMANTIC_FACETS_CONFIG[facetName]) {
    return true;
  } else {
    throw new BadRequestError(
      `Unable to calculate the '${facetName}' facet: not an available facet.`,
    );
  }
}
//#endregion

//#region Internal functions
function _getFacetResponse(
  facetName,
  facetValues,
  searchCriteriaProcessor,
  totalItems,
  page,
  pageLength,
) {
  const searchCriteria = searchCriteriaProcessor.getSearchCriteria();
  const searchScope = searchCriteriaProcessor.getSearchScope();
  const orderedItems = facetValues.map((item) => {
    const { count, value } = item;
    const facetSearchCriteria = _getFacetSearchCriteria(
      searchCriteria,
      facetName,
      value,
    );
    return {
      id: utils.buildSearchEstimateUri(facetSearchCriteria, searchScope),
      type: AS_TYPE_ORDERED_COLLECTION,
      totalItems: count,
      value,
    };
  });

  const response = {
    '@context': LUX_CONTEXT,
    id: utils.buildFacetsUri(
      searchCriteria,
      searchScope,
      facetName,
      page,
      pageLength,
    ),
    type: AS_TYPE_ORDERED_COLLECTION_PAGE,
    partOf: {
      type: AS_TYPE_ORDERED_COLLECTION,
      totalItems,
    },
    orderedItems,
  };

  if (page > 1) {
    response.prev = {
      id: utils.buildFacetsUri(
        searchCriteria,
        searchScope,
        facetName,
        page - 1,
        pageLength,
      ),
      type: AS_TYPE_ORDERED_COLLECTION_PAGE,
    };
  }

  if (page < Math.ceil(totalItems / pageLength)) {
    response.next = {
      id: utils.buildFacetsUri(
        searchCriteria,
        searchScope,
        facetName,
        page + 1,
        pageLength,
      ),
      type: AS_TYPE_ORDERED_COLLECTION_PAGE,
    };
  }
  return response;
}

function _getFacetSearchCriteria(searchCriteria, facetName, facetValue) {
  if (isSemanticFacet(facetName)) {
    return SEMANTIC_FACETS_CONFIG[facetName].getFacetSelectedCriteria(
      searchCriteria,
      facetValue,
    );
  } else {
    return {
      AND: [searchCriteria, _convertFacetToSearchTerm(facetName, facetValue)],
    };
  }
}

function _convertFacetToSearchTerm(facetName, facetValue) {
  const searchTermsConfig = getSearchTermsConfig();

  // if this facet has subFacets, convert each subFacet to a search term
  if (FACETS_CONFIG[facetName].subFacets) {
    return {
      OR: FACETS_CONFIG[facetName].subFacets.map((subFacetName) =>
        _convertFacetToSearchTerm(subFacetName, facetValue),
      ),
    };
  }

  let { scopeName, termName } = facetToScopeAndTermName(facetName);
  //facets ending in Id usually convert to search terms without Id
  if (termName.endsWith('Id')) {
    const termNameWithoutId = termName.substring(0, termName.length - 2);
    if (searchTermsConfig[scopeName][termNameWithoutId]) {
      termName = termNameWithoutId;
    }
  }
  if (!searchTermsConfig[scopeName][termName]) {
    throw new InternalServerError(
      `Unable to convert '${facetName}' to a search term`,
    );
  }
  const searchTermInfo = searchTermsConfig[scopeName][termName];
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
//#endregion

export { getFacet, isSemanticFacet };
