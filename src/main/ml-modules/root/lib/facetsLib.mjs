/*
 * Welcome to the facets endpoint!
 *
 * In June 2024 it was decided that the facets endpoint should be paginated. When the facet response
 * size was large enough, it was contributing to crashing the V8 Engine in MarkLogic Server.  Adding
 * pagination restored stability to the system during performance tests.  In order to accommodate
 * the frontend's timeline functionality, it was decide to allow the frontend to request a very large
 * pageLength in order to retrieve all facet values for a given facet.  Despite a semantic facet
 * optimization in January 2025 (#365), we elected to keep the smaller semantic facet page length
 * yet note the existing semantic facets do not have more than 100 values anyway.  For more details
 * see issues #160, #161, and #162 in the lux-marklogic GitHub project:
 * https://github.com/project-lux/lux-marklogic
 */
import { FACETS_CONFIG } from '../config/facetsConfig.mjs';
import { getSearchTermsConfig } from '../../config/searchTermsConfig.mjs';
import { SearchCriteriaProcessor } from './SearchCriteriaProcessor.mjs';
import {
  AS_TYPE_ORDERED_COLLECTION,
  AS_TYPE_ORDERED_COLLECTION_PAGE,
  DEFAULT_FILTER_SEMANTIC_FACET_SEARCH_RESULTS,
  LUX_CONTEXT,
  TRACE_NAME_FACETS as traceName,
} from './appConstants.mjs';
import { processSearchCriteria } from './searchLib.mjs';
import { convertSecondsToDateStr } from '../utils/dateUtils.mjs';
import * as utils from '../utils/utils.mjs';
import {
  BadRequestError,
  InternalServerError,
  isInvalidSearchRequestError,
} from './mlErrorsLib.mjs';
import { SEMANTIC_FACETS_CONFIG } from '../config/semanticFacetsConfig.mjs';
import { facetToScopeAndTermName } from '../utils/searchTermUtils.mjs';

const SEARCH_TERMS_CONFIG = getSearchTermsConfig();

// Pagination constants
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_LENGTH = 20;
const MAXIMUM_NON_SEMANTIC_PAGE_LENGTH = 10000;
const MAXIMUM_SEMANTIC_PAGE_LENGTH = 100;

const DEFAULT_SORT = 'frequency-order';

function getFacet({
  facetName,
  searchCriteria = null,
  searchScope = null,
  page = DEFAULT_PAGE,
  pageLength = DEFAULT_PAGE_LENGTH,
  sort = DEFAULT_SORT,
  filterResults = DEFAULT_FILTER_SEMANTIC_FACET_SEARCH_RESULTS,
}) {
  const start = new Date();
  let requestCompleted = false;
  let InvalidSearchRequestError = false;
  let isSemantic = 'unk'; // set within try block but referenced in catch block.

  try {
    const searchCriteriaProcessor = searchCriteria
      ? processSearchCriteria({
          searchCriteria,
          searchScope,
          allowMultiScope: false,
          // The filterResults parameter is used elsewhere, specific to semantic facet requests.
          filterResults: false,
        })
      : null;

    // Get the raw facet values and value counts.
    let facetValues = null;
    let totalItems = null;
    isSemantic = _isSemanticFacet(facetName);
    if (isSemantic) {
      // Validate pagination parameters (and impose a maximum number per request).
      utils.checkPaginationParameters(page, pageLength);
      pageLength = Math.min(pageLength, MAXIMUM_SEMANTIC_PAGE_LENGTH);
      ({ totalItems, facetValues } = _calculateSemanticFacet(
        facetName,
        searchCriteriaProcessor,
        page,
        pageLength,
        filterResults
      ));
    } else {
      utils.checkPaginationParameters(page, pageLength);
      pageLength = Math.min(pageLength, MAXIMUM_NON_SEMANTIC_PAGE_LENGTH);
      ({ totalItems, facetValues } = _calculateNonSemanticFacet(
        facetName,
        searchCriteriaProcessor,
        page,
        pageLength,
        sort
      ));
    }

    // Format as Activity Streams
    facetValues = _getFacetResponse(
      facetName,
      facetValues,
      searchCriteriaProcessor,
      totalItems,
      page,
      pageLength
    );
    requestCompleted = true;
    return facetValues;
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
        `Calculated the following facet in ${duration} milliseconds: ${facetName} (page: ${page}; pageLength: ${pageLength}; filterResults: ${
          isSemantic === true ? filterResults : 'n/a'
        })`
      );
    } else if (InvalidSearchRequestError) {
      // Not associated to a monitoring test or the log mining script.
      xdmp.trace(
        traceName,
        `Unable to calculate the '${facetName}' facet due to an invalid search request.`
      );
    } else {
      // Monitoring test and log mining script checks for "Failed to calculate".
      xdmp.trace(
        traceName,
        `Failed to calculate the following facet after ${duration} milliseconds: ${facetName} (page: ${page}; pageLength: ${pageLength}; filterResults: ${
          isSemantic === true ? filterResults : 'n/a'
        })`
      );
    }
  }
}

function _getFacetResponse(
  facetName,
  facetValues,
  searchCriteriaProcessor,
  totalItems,
  page,
  pageLength
) {
  const searchCriteria = searchCriteriaProcessor.getSearchCriteria();
  const searchScope = searchCriteriaProcessor.getSearchScope();
  const orderedItems = facetValues.map((item) => {
    const { count, value } = item;
    const facetSearchCriteria = _getFacetSearchCriteria(
      searchCriteria,
      facetName,
      value
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
      pageLength
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
        pageLength
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
        pageLength
      ),
      type: AS_TYPE_ORDERED_COLLECTION_PAGE,
    };
  }
  return response;
}

function _isSemanticFacet(facetName) {
  if (FACETS_CONFIG[facetName]) {
    return false;
  } else if (SEMANTIC_FACETS_CONFIG[facetName]) {
    return true;
  } else {
    throw new BadRequestError(
      `Unable to calculate the '${facetName}' facet: not an available facet.`
    );
  }
}

// Support presently limited to field range indexes (via cts.fieldValues).
function _calculateNonSemanticFacet(
  facetName,
  searchCriteriaProcessor,
  page,
  pageLength,
  sort
) {
  const fieldValuesOptions = ['lazy', 'score-zero'];
  switch (sort) {
    case 'asc':
      fieldValuesOptions.push('ascending');
      break;
    case 'desc':
      fieldValuesOptions.push('descending');
      break;
    default:
      fieldValuesOptions.push('frequency-order');
  }

  // Require search criteria.
  const ctsQueryStr = searchCriteriaProcessor
    ? searchCriteriaProcessor.getCtsQueryStr(false)
    : null;
  if (!utils.isNonEmptyString(ctsQueryStr)) {
    _throwSearchCriteriaRequiredError();
  }

  const ctsQuery = SearchCriteriaProcessor.evalQueryString(ctsQueryStr);

  const sequence = cts.fieldValues(
    FACETS_CONFIG[facetName].indexReference,
    null,
    fieldValuesOptions,
    ctsQuery
  );

  const isDateFacet = facetName.endsWith('Date');

  return {
    totalItems: fn.count(sequence),
    facetValues: fn
      .subsequence(
        sequence,
        utils.getStartingPaginationIndexForSubsequence(page, pageLength),
        pageLength
      )
      .toArray()
      .map((value) => ({
        value: isDateFacet ? convertSecondsToDateStr(value) : value,
        count: cts.frequency(value),
      })),
  };
}

function _calculateSemanticFacet(
  facetName,
  searchCriteriaProcessor,
  page,
  pageLength,
  filterResults
) {
  // Require search criteria.
  const baseSearchCtsQuery = searchCriteriaProcessor
    ? SearchCriteriaProcessor.evalQueryString(
        searchCriteriaProcessor.getCtsQueryStr(false)
      )
    : null;
  if (!baseSearchCtsQuery) {
    _throwSearchCriteriaRequiredError();
  }

  const semanticFacetConfig = SEMANTIC_FACETS_CONFIG[facetName];

  const potentialFacetValuesCtsQuery =
    semanticFacetConfig.potentialFacetValuesCtsQuery;

  const potentialFacetValues = fn
    .subsequence(
      cts.search(potentialFacetValuesCtsQuery, [
        'unfiltered',
        'unfaceted',
        'score-zero',
      ]),
      1,
      MAXIMUM_SEMANTIC_PAGE_LENGTH
    )
    .toArray();

  const facetValues = potentialFacetValues
    .map((doc) => {
      const uri = doc.baseURI;
      return {
        value: uri,
        count: cts.estimate(
          semanticFacetConfig.getValuesCountCtsQuery(baseSearchCtsQuery, uri)
        ),
      };
    })
    // Drop potential facet values that do not apply to this search.;
    .filter((result) => result.count > 0)
    .sort((a, b) => b.count - a.count);

  const startIndex = utils.getStartingPaginationIndexForSplice(
    page,
    pageLength
  );
  const endIndex = startIndex + pageLength;
  // thanks to the logic of Array.prototype.slice():
  // if startIndex > facetValues.length, an empty array is returned
  // if endIndex > facetValues.length, only values up to the end of the array are returned
  return {
    totalItems: facetValues.length,
    facetValues: facetValues.slice(startIndex, endIndex),
  };
}

function _throwSearchCriteriaRequiredError() {
  throw new BadRequestError(`The facet request requires search criteria.`);
}

function _getFacetSearchCriteria(searchCriteria, facetName, facetValue) {
  if (_isSemanticFacet(facetName)) {
    return SEMANTIC_FACETS_CONFIG[facetName].getFacetSelectedCriteria(
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
    if (SEARCH_TERMS_CONFIG[scopeName][termNameWithoutId]) {
      termName = termNameWithoutId;
    }
  }
  if (!SEARCH_TERMS_CONFIG[scopeName][termName]) {
    throw new InternalServerError(
      `Unable to convert '${facetName}' to a search term`
    );
  }
  const searchTermInfo = SEARCH_TERMS_CONFIG[scopeName][termName];
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

export { getFacet };
