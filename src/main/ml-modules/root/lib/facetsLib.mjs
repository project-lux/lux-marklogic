import { FACETS_CONFIG } from '../config/facetsConfig.mjs';
import { getSearchTermsConfig } from '../../config/searchTermsConfig.mjs';
import { SearchCriteriaProcessor } from './SearchCriteriaProcessor.mjs';
import {
  AS_TYPE_ORDERED_COLLECTION,
  AS_TYPE_ORDERED_COLLECTION_PAGE,
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

// Pagination defaults
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_LENGTH = 20;
// A large non-semantic facet page size is in support of frontend's timeline functionality.
const MAXIMUM_NON_SEMANTIC_PAGE_LENGTH = 10000;
// Semantic facet requests are subject to a maximum number of values, regardless of pagination
// parameter values.  Courtesy of an optimization (#365), this limit could be increased.  There's
// no point until there is a semantic facet that has more values than this limit.  A warning is
// logged if there are more values than this limit.
const SEMANTIC_VALUE_LIMIT = 100;

const DEFAULT_SORT = 'frequency-order';

function getFacet({
  facetName,
  searchCriteria = null,
  searchScope = null,
  page = DEFAULT_PAGE,
  pageLength = DEFAULT_PAGE_LENGTH,
  sort = DEFAULT_SORT,
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
      pageLength = Math.min(pageLength, SEMANTIC_VALUE_LIMIT);
      ({ totalItems, facetValues } = _calculateSemanticFacet(
        facetName,
        searchCriteriaProcessor,
        page,
        pageLength
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
        `Calculated the following facet in ${duration} milliseconds: ${facetName} (page: ${page}; pageLength: ${pageLength})`
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
        `Failed to calculate the following facet after ${duration} milliseconds: ${facetName} (page: ${page}; pageLength: ${pageLength})`
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
    ? searchCriteriaProcessor.getCtsQueryStr()
    : null;
  if (!utils.isNonEmptyString(ctsQueryStr)) {
    _throwSearchCriteriaRequiredError();
  }

  const ctsQuery = SearchCriteriaProcessor.evalQueryString(ctsQueryStr);

  const facetConfig = FACETS_CONFIG[facetName];

  const indexReferences = facetConfig.subFacets
    ? facetConfig.subFacets.map(
        (subFacetName) => FACETS_CONFIG[subFacetName].indexReference
      )
    : [facetConfig.indexReference];

  const sequence = cts.fieldValues(
    indexReferences,
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
  pageLength
) {
  // Require search criteria.
  const baseSearchCtsQuery = searchCriteriaProcessor
    ? SearchCriteriaProcessor.evalQueryString(
        searchCriteriaProcessor.getCtsQueryStr()
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
      SEMANTIC_VALUE_LIMIT + 1
    )
    .toArray();

  // Warn when there were more facet values than allowed.
  if (potentialFacetValues.length > SEMANTIC_VALUE_LIMIT) {
    console.warn(
      `The '${facetName}' facet exceeded the ${SEMANTIC_VALUE_LIMIT} value limit with base search criteria ${JSON.stringify(
        baseSearchCriteria
      )}`
    );
  }

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
  const searchTermsConfig = getSearchTermsConfig();

  // if this facet has subFacets, convert each subFacet to a search term
  if (FACETS_CONFIG[facetName].subFacets) {
    return {
      OR: FACETS_CONFIG[facetName].subFacets.map((subFacetName) =>
        _convertFacetToSearchTerm(subFacetName, facetValue)
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
      `Unable to convert '${facetName}' to a search term`
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

export { getFacet };
