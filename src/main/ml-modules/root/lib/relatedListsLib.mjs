import {
  AS_TYPE_ORDERED_COLLECTION,
  AS_TYPE_ORDERED_COLLECTION_PAGE,
  DEFAULT_FILTER_RELATED_LIST_SEARCH_RESULTS,
  IRI_DOES_NOT_EXIST,
  LUX_CONTEXT,
  RELATED_LIST_PAGE_LENGTH_DEFAULT,
  RELATED_LIST_PER_RELATION_DEFAULT,
  RELATED_LIST_PER_RELATION_MAX,
  RELATED_LIST_TIMEOUT,
  TOKEN_RUNTIME_PARAM,
  TRACE_NAME_RELATED_LIST as traceName,
} from './appConstants.mjs';
import * as utils from '../utils/utils.mjs';
import { BadRequestError } from './mlErrorsLib.mjs';
import { processSearchCriteria } from './searchLib.mjs';
import { SearchPatternOptions } from './SearchPatternOptions.mjs';
import {
  OPTION_NAME_EAGER_EVALUATION,
  OPTION_NAME_MAXIMUM_VALUES,
  OPTION_NAME_RETURN_VALUES,
} from './searchPatternsLib.mjs';
import { getRelatedListConfig } from '../config/relatedListsConfig.mjs';
import { getRelationName } from '../config/relationNames.mjs';
import {
  getInverseSearchTermInfo,
  getSearchTermConfig,
} from '../config/searchTermConfig.mjs';
import { SearchCriteriaProcessor } from './SearchCriteriaProcessor.mjs';
import { PATTERN_NAME_RELATED_LIST } from './searchPatternsLib.mjs';

// Testing of a highly reference concept revealed page lengths between 25 and 15,000 returned within one second
// of each and that secondary page requests take just as long as primary page requests.  Thus, this maximum is
// more along the lines of limiting the response size.  15,000 weighed in at 6.5 MB.
const MAXIMUM_PAGE_LENGTH = 1000;

// Means to favor relations with fewer triples when determining if a related list will have at least one item.
// Relations you wish to process later should be given a number larger than zero (the default).  Original values
// are the number of seconds witnessed for highly referenced documents.  When only determining if a related list
// has at least one item, the higher the number, the later it will be processed, if at all.
const PRIORITY_BY_RELATION_KEY = {
  'classificationOfItem-classification': 4,
  'classificationOfWork-classification': 6,
  'created-classification': 9,
  'createdHere-classification': 8,
  'languageOf-classification': 2,
  'materialOfItem-classification': 3,
  'produced-classification': 6,
  'publishedHere-classification': 4,
  'subjectOfConcept-classification': 7,
  'usedToProduce-classification': 3,
};

/**
 * Retrieve a set of items related to the specified document.  Each item identifies the related document's URI,
 * the name of the relationship, relationship counts, and search criteria.  Results are sorted by total number
 * of relationships, from most to least.  The associated endpoint's API usage documentation contains additional
 * information.
 *
 * @param {Object} Provide parameters as a single object with the following top-level properties.
 *    {String} searchScopeName: Search scope of the items to return, such as "place".
 *    {String} relatedListName: The related list's search term name, such as "relatedToConcept".
 *    {String} uri: The URI of the document to find the related items of.  This should have the same
 *       search scope as the related list's name.  For example, if relatedListName is "relatedToAgent",
 *       the URI should be of a Person or Group.
 *    {int} page: The starting page.  Default is 1.
 *    {int} pageLength: The number of items per page.  Default is 25.
 *    {boolean} filterResults: Submit true to filter search results.  Filtering can slow the request but can
 *       remove false positives.  TBD if related lists _can_ return false positives.  Recommendation: submit
 *       false unless you have discovered a false positive and cannot accept it.  The default is specified by
 *       a build property (via constant).
 *    {int} relationshipsPerRelation: The maximum number of relationships to process per relation.  Each related
 *       list may have 12+ relations.  Each relation is resolved in the triples store.  Without capping highly
 *       referenced documents, requests can take an excessive amount of time.
 *    {boolean} onlyCheckForOneRelatedItem: Submit true when you only want to know if there is at least one
 *       related item.  When submitting true, the only response property of interest will be hasOneOrMoreResult.
 *       Defaults to false.
 * @throws {BadRequestError} when URI is not specified or the specified related list's configuration does not exist.
 * @returns {Object} Object with two top-level properties.  The "hasOneOrMoreResult" property will be set to true
 *    when there is at least one result.  This is most relevant when onlyCheckForOneRelatedItem is true as the
 *    hasOneOrMoreResult property may be set to true or false yet the results property will always be an empty
 *    array when onlyCheckForOneRelatedItem is true (i.e., the first result will not be returned).  When
 *    onlyCheckForOneRelatedItem is false, "results" property will be an array of zero or more objects whose
 *    model is:
 *      {
 *        uri: "https://lux.collections.yale.edu/data/person/e083db84-aecd-4273-bbd6-06ab407f2af7",
 *        relationName: "About or Depicts",
 *        relationCount: 2,
 *        totalCount: 3,
 *        estimate: 1,
 *        criteria: [Item's search criteria object that may be used without manipulation],
 *        scope: [search scope left for backwards-compatibility and endpoint consumer convenience]
 *      }
 */
function getRelatedList({
  searchScopeName,
  relatedListName,
  uri,
  page = 1,
  pageLength = RELATED_LIST_PAGE_LENGTH_DEFAULT,
  filterResults = DEFAULT_FILTER_RELATED_LIST_SEARCH_RESULTS,
  relationshipsPerRelation = RELATED_LIST_PER_RELATION_DEFAULT,
  onlyCheckForOneRelatedItem = false,
}) {
  const start = new Date();
  let requestCompleted = false;
  let hasOneOrMoreResult = false;
  let relationsChecked = 0;

  try {
    xdmp.setRequestTimeLimit(RELATED_LIST_TIMEOUT);

    if (!utils.isNonEmptyString(uri)) {
      throw new BadRequestError(
        `The value of 'uri' parameter must be a non-empty string.`
      );
    }

    // Get the configuration.  Error is thrown if not a related list.
    const relatedListConfig = getRelatedListConfig(
      searchScopeName,
      relatedListName
    );

    // In this aggregate context, exclude type criteria and force the Hop Inverse pattern to return calls to cts.triples.
    const includeTypeConstraint = false;
    const searchPatternOptions = new SearchPatternOptions();
    searchPatternOptions.set(OPTION_NAME_RETURN_VALUES, true);

    // Set the maximum number of values to process per relation. Do not let requester exceed the maximum imposed by the backend.
    relationshipsPerRelation = Math.min(
      relationshipsPerRelation,
      RELATED_LIST_PER_RELATION_MAX
    );
    searchPatternOptions.set(
      OPTION_NAME_MAXIMUM_VALUES,
      relationshipsPerRelation
    );

    // When we only need a handful of triples, switch to lazy evaluation.
    searchPatternOptions.set(
      OPTION_NAME_EAGER_EVALUATION,
      relationshipsPerRelation < 20 ? false : true
    );

    // Validate pagination parameters and impose a maximum page length.
    utils.checkPaginationParameters(page, pageLength);
    pageLength = Math.min(pageLength, MAXIMUM_PAGE_LENGTH);

    // Collect the URIs for each relationship.
    const urisByRelation = {};
    const relationToScope = {}; // And the scopes
    const relationToCriteria = {}; // And the resolved search criteria
    const searchConfigs = sortByPriority(relatedListConfig.searchConfigs);
    // Old school loop to give this boomer confidence the order is honored.
    for (let i = 0; i < searchConfigs.length; i++) {
      const searchConfig = searchConfigs[i];
      const valuesOnly = searchConfig.mode == 'values';
      const searchCriteriaProcessor = processSearchCriteria({
        searchCriteria: utils.replaceMatchingPropertyValues(
          searchConfig.criteria,
          TOKEN_RUNTIME_PARAM,
          uri
        ),
        searchScope: relatedListConfig.targetScope,
        searchPatternOptions,
        includeTypeConstraint,
        valuesOnly,
        page: 1,
        pageLength: relationshipsPerRelation, // Applies when not in values mode.
        filterResults,
      });
      if (valuesOnly) {
        urisByRelation[searchConfig.relationKey] =
          searchCriteriaProcessor.getValues();
      } else {
        urisByRelation[searchConfig.relationKey] = searchCriteriaProcessor
          .getSearchResults()
          .map((result) => result.id);
      }
      // No need to log that we hit the max in the Search Will Match context; it sets this threshold very low.
      if (
        relationshipsPerRelation > 10 &&
        urisByRelation[searchConfig.relationKey].length >=
          relationshipsPerRelation
      ) {
        // Monitoring test and log mining script checks for "Hit the max".
        xdmp.trace(
          traceName,
          `Hit the max of ${relationshipsPerRelation} relationships for the '${searchConfig.relationKey}' relation with scope '${searchScopeName}', term '${relatedListName}', and URI '${uri}' (filterResults: ${filterResults}).`
        );
      }
      relationToScope[searchConfig.relationKey] = searchConfig.relationScope;
      relationToCriteria[searchConfig.relationKey] =
        searchCriteriaProcessor.getSearchCriteria();

      relationsChecked++;

      // Bail if we've only been asked to determine if there is at least one related item and we found one.
      if (onlyCheckForOneRelatedItem) {
        urisByRelation[searchConfig.relationKey].every((relatedUri) => {
          if (_notSelfOrDoesNotExist(uri, relatedUri)) {
            hasOneOrMoreResult = true;
            return false; // no need to check additional related URIs.
          }
          return true; // continue looking for a qualifying related URI.
        });

        // No need to check other relations if we found a result.
        if (hasOneOrMoreResult) {
          break;
        }
      }
    }

    // We can stop processing now when asked to determine if there is at least one related item.
    if (onlyCheckForOneRelatedItem) {
      requestCompleted = true;
      return _formatRelatedListReturn(
        null,
        [true],
        searchScopeName,
        relatedListName,
        uri,
        page,
        pageLength,
        relationshipsPerRelation
      );
    }

    /*
     * Format the data such that we can sort by the URI with the greatest number of relationships while
     * retaining the specific ways in which it is related, and the number of times per relationship.
     *
     * Structure:
     *
     * {
     *   uri_1: {
     *     total: 1,
     *     rel_1: {
     *       scope: work,
     *       count: 1
     *     },
     *     ...other relationships
     *   },
     *   ...other related documents
     * }
     *
     */
    let dataByUri = {};
    Object.keys(urisByRelation).forEach((relationKey) => {
      urisByRelation[relationKey].forEach((relatedUri) => {
        if (_notSelfOrDoesNotExist(uri, relatedUri)) {
          if (!dataByUri[relatedUri]) {
            dataByUri[relatedUri] = {
              total: 0,
            };
          }
          if (!dataByUri[relatedUri][relationKey]) {
            dataByUri[relatedUri][relationKey] = {
              scope: relationToScope[relationKey],
              count: 0,
            };
          }
          dataByUri[relatedUri].total++;
          dataByUri[relatedUri][relationKey].count++;
        }
      });
    });

    /*
     * Convert to an array and sort to get the related URIs with the greatest number of relationships to the top.
     *
     * Structure of one item in the array being made:
     *
     * [
     *   "uri_1",
     *   {
     *     total: 1,
     *     rel_1: {
     *       scope: "work",
     *       count: 1
     *     },
     *     ...other relationships
     *   }
     * ],
     * ...other related documents
     *
     */
    const dataByUriAll = Object.entries(dataByUri).sort(
      ([, a], [, b]) => b.total - a.total
    );
    // Determine if the next page would have any results.
    const idx = utils.getStartingPaginationIndexForSplice(page, pageLength);
    const hasMore = dataByUriAll.length > idx + pageLength;
    // Dropping what we can at this point.  If every related doc was only related one time, we would
    // need the first pageLength items in this array.
    dataByUri = dataByUriAll.splice(idx, pageLength);

    /*
     * Create the final structure, only including the first n unique pairings of uri and relationship.
     *
     * Structure we're to create per entry:
     *
     *   {
     *       "id": "https://lux.../api/search-estimate/scope?q=...",
     *       "type": "OrderedCollection",
     *       "totalItems": 28,
     *       "first": "https://lux.../api/search/scope?q=...",
     *       "value": "${URI}",
     *       "name": "Is the Category Of Works About"
     *   },
     *
     */
    let orderedItems = [];
    for (let s = 0; s < dataByUri.length; s++) {
      const relatedUri = dataByUri[s][0];
      const relatedDataByRelationKey = dataByUri[s][1];
      const relationKeys = Object.keys(relatedDataByRelationKey).filter(
        (key) => key != 'total'
      );
      for (let t = 0; t < relationKeys.length; t++) {
        const relationKey = relationKeys[t];
        const relationData = relatedDataByRelationKey[relationKey];
        const criteria = _convertToObjectsOrWorksSearch(
          relatedListConfig.targetScope,
          relationToCriteria[relationKey],
          relatedUri,
          relationData.scope
        );
        delete criteria._scope;
        orderedItems.push({
          id: utils.buildSearchEstimateUri(criteria, relationData.scope),
          type: AS_TYPE_ORDERED_COLLECTION,
          totalItems: relationData.count,
          first: {
            id: utils.buildSearchUri({
              searchCriteria: criteria,
              scope: relationData.scope,
            }),
            type: AS_TYPE_ORDERED_COLLECTION_PAGE,
          },
          value: relatedUri,
          name: getRelationName(relationKey),
          totalCount: relatedDataByRelationKey.total,
        });
        if (orderedItems.length >= pageLength) {
          break;
        }
      }
      if (orderedItems.length >= pageLength) {
        break;
      }
    }

    // Last sort: when a document is related in multiple ways, sort the relationships with the greater counts first.
    orderedItems = orderedItems.sort(
      (a, b) => b.totalCount - a.totalCount || b.totalItems - a.totalItems
    );

    orderedItems.forEach((orderedItem) => {
      delete orderedItem.totalCount;
    });

    requestCompleted = true;
    return _formatRelatedListReturn(
      hasMore,
      orderedItems,
      searchScopeName,
      relatedListName,
      uri,
      page,
      pageLength,
      relationshipsPerRelation
    );
  } finally {
    const duration = new Date().getTime() - start.getTime();
    if (requestCompleted) {
      if (onlyCheckForOneRelatedItem) {
        // Log mining script matches on a portion(s) of this message.
        xdmp.trace(
          traceName,
          `Checked ${relationsChecked} relation(s) to determine the '${relatedListName}' list in scope '${searchScopeName}' for '${uri}' ${
            hasOneOrMoreResult ? 'has' : 'does not have'
          } at least one related item, in ${duration} milliseconds (page: ${page}; pageLength: ${pageLength}).`
        );
      } else {
        // Log mining script matches on a portion(s) of this message.
        xdmp.trace(
          traceName,
          `Created the '${relatedListName}' list in scope '${searchScopeName}' for '${uri}' in ${duration} milliseconds (page: ${page}; pageLength: ${pageLength}; filterResults: ${filterResults}).`
        );
      }
    } else {
      if (onlyCheckForOneRelatedItem) {
        // Log mining script matches on a portion(s) of this message.
        xdmp.trace(
          traceName,
          `Unable to determine the '${relatedListName}' list in scope '${searchScopeName}' for '${uri}' has at least one related item, after ${duration} milliseconds (page: ${page}; pageLength: ${pageLength}; filterResults: ${filterResults}).`
        );
      } else {
        // Log mining script matches on a portion(s) of this message.
        xdmp.trace(
          traceName,
          `Failed to create the '${relatedListName}' list in scope '${searchScopeName}' for '${uri}' after ${duration} milliseconds (page: ${page}; pageLength: ${pageLength}; filterResults: ${filterResults}).`
        );
      }
    }
  }
}

function sortByPriority(searchConfigs) {
  const sorted = searchConfigs.sort((searchConfig_1, searchConfig_2) => {
    return _getPriority(searchConfig_1) - _getPriority(searchConfig_2);
  });
  const entries = [];
  sorted.forEach((searchConfig) =>
    entries.push(`${_getPriority(searchConfig)}: ${searchConfig.relationKey}`)
  );
  return sorted;
}

function _getPriority(searchConfig) {
  let priority = 0;
  if (PRIORITY_BY_RELATION_KEY[searchConfig.relationKey]) {
    priority = PRIORITY_BY_RELATION_KEY[searchConfig.relationKey];
  } else if (searchConfig.relationKey.endsWith('-classification')) {
    priority = 3;
  }
  return priority;
}

function _notSelfOrDoesNotExist(selfUri, candidateUri) {
  return ![selfUri, IRI_DOES_NOT_EXIST].includes(candidateUri);
}

function _formatRelatedListReturn(
  hasMore,
  orderedItems,
  scope,
  name,
  uri,
  page,
  pageLength,
  relationshipsPerRelation
) {
  const relatedListReturn = {
    '@context': LUX_CONTEXT,
    id: utils.buildRelatedListUri({
      scope,
      name,
      uri,
      page,
      pageLength,
      relationshipsPerRelation,
    }),
    type: AS_TYPE_ORDERED_COLLECTION_PAGE,
    orderedItems,
  };
  if (hasMore) {
    relatedListReturn.next = {
      id: utils.buildRelatedListUri({
        scope,
        name,
        uri,
        page: page + 1,
        pageLength,
        relationshipsPerRelation,
      }),
      type: AS_TYPE_ORDERED_COLLECTION_PAGE,
    };
  }
  return relatedListReturn;
}

function _convertToObjectsOrWorksSearch(
  fromScope,
  fromCriteria,
  relatedUri,
  toScope
) {
  const objectsOrWorksCriteria = {
    _scope: toScope,
    AND: [],
  };

  // Need to identify the top-level search term name.
  if (SearchCriteriaProcessor.hasNonOptionPropertyName(fromCriteria)) {
    const termName =
      SearchCriteriaProcessor.getFirstNonOptionPropertyName(fromCriteria);

    // Need the inverse of the top-level search term.
    const inverseTermInfo = getInverseSearchTermInfo(fromScope, termName);
    if (inverseTermInfo) {
      // First criterion is in inverse search term, applying the related URI.
      const criterion = {};
      criterion[inverseTermInfo.searchTermName] = { id: relatedUri };
      objectsOrWorksCriteria.AND.push(criterion);

      // Second is the value of the top-level search term, after converting any iri terms to id terms, to force
      // use of the field range indexes / Indexed Value search pattern.
      objectsOrWorksCriteria.AND.push(
        utils.replaceMatchingPropertyNames(fromCriteria[termName], 'iri', 'id')
      );
    } else {
      // TBD if this ever happens.
      // Log mining script matches on a portion(s) of this message.
      const msg = `Unable to determine the inverse search term of '${termName}', beginning in the '${fromScope}' scope: ${JSON.stringify(
        fromCriteria
      )}`;
      xdmp.trace(traceName, msg);
      return msg;
    }
  } else {
    // TBD if this ever happens.
    // Log mining script matches on a portion(s) of this message.
    const msg = 'Unable to determine search term name.';
    xdmp.trace(traceName, msg);
    return msg;
  }

  return objectsOrWorksCriteria;
}

// Responsible for returning the query that terms configured to the related list search pattern.
function getRelatedListQuery(
  searchTerm,
  resolvedSearchOptions,
  searchPatternOptions,
  requestOptions
) {
  const searchScopeName = searchTerm.getScopeName();
  const relatedListName = searchTerm.getName();

  // In this non-aggregate context, exclude type criteria and have the patterns return queries.
  const includeTypeConstraint = false;
  const relatedListSearchPatternOptions = new SearchPatternOptions();
  relatedListSearchPatternOptions.set(OPTION_NAME_RETURN_VALUES, false);

  // Create a flat OR query out of all the individual relationship queries.  Should a hierarchial query be
  // more performant and we need that improvement, the related list configuration generator could be modified
  // to create flat and hierarchial versions.
  const relatedListConfig = getRelatedListConfig(
    searchScopeName,
    relatedListName
  );
  const query = {
    OR: relatedListConfig.searchConfigs.map((searchConfig) => {
      return searchConfig.criteria;
    }),
  };

  const searchCriteriaProcessor = processSearchCriteria({
    searchCriteria: utils.replaceMatchingPropertyValues(
      query,
      TOKEN_RUNTIME_PARAM,
      searchTerm.getValue()
    ),
    searchScope: relatedListConfig.targetScope,
    searchPatternOptions: relatedListSearchPatternOptions,
    includeTypeConstraint,
    filterResults: requestOptions.filterResults,
    valuesOnly: false,
  });

  return searchCriteriaProcessor.getCtsQueryStr(false);
}

function getRelatedListSearchInfo(criteria) {
  const searchTermConfig = _getFirstSearchTermConfig(criteria);
  const isRelatedList =
    searchTermConfig != null &&
    searchTermConfig.patternName == PATTERN_NAME_RELATED_LIST;
  return {
    isRelatedList,
    scopeName: isRelatedList ? searchTermConfig.scopeName : null,
    termName: isRelatedList ? searchTermConfig.termName : null,
    uri: isRelatedList ? criteria[searchTermConfig.termName] : null,
  };
}

function _getFirstSearchTermConfig(criteria) {
  const scopeName = criteria._scope;
  const termName =
    SearchCriteriaProcessor.getFirstNonOptionPropertyName(criteria);
  return {
    scopeName,
    termName,
    ...getSearchTermConfig(scopeName, termName),
  };
}

export { getRelatedList, getRelatedListQuery, getRelatedListSearchInfo };
