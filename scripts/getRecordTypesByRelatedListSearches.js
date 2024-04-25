/*
 * Walk all triple searches of every related list to determine which
 * record types the searches are drawing triples from.
 *
 * Originally created to assess the risk of related lists tapping into
 * triples defined in documents the backend consumer is able to access
 * yet construct searches of related Objects and Works that the consumer
 * does not have access to.  In April 2024 this risk was limited to
 * 10 of 140 triple searches that pertain to the Activity and Period
 * record types (Event search scope) --these comprise 0.09% of the LUX
 * dataset and thus the risk is deemed low.  Should we need to address
 * this, we should be able to use this technique to programmatically
 * denote which triple searches require additional scrutiny.
 *
 * Usage: Set term2Types to the return of getRecordTypesByPredicates.js,
 * then run.
 */
'use strict';
import {
  getRelatedListConfig,
  getRelatedListKeys,
} from '/config/relatedListsConfig.mjs';
import { SEARCH_TERM_CONFIG } from '/config/searchTermConfig.mjs';
import { getSearchScopes } from '/lib/searchScope.mjs';

const addSearchScopeToTypeLabel = true;

// Run getRecordTypesByPredicates.js and set term2Types to its return.
const term2Types = {};

const getScopeFromType = (type) => {
  let winner = null;
  Object.keys(getSearchScopes()).forEach((searchScope) => {
    if (getSearchScopes()[searchScope].types.includes(type)) {
      winner = searchScope;
    }
  });
  return winner;
};
if (addSearchScopeToTypeLabel) {
  Object.keys(term2Types).forEach((searchScope) => {
    Object.keys(term2Types[searchScope]).forEach((termName) => {
      term2Types[searchScope][termName] = term2Types[searchScope][termName].map(
        (type) => {
          const searchScope = getScopeFromType(type);
          return `${type} - ${searchScope.toUpperCase()}${
            searchScope != 'work' && searchScope != 'item' ? ' - Bingo!' : ''
          }`;
        }
      );
    });
  });
}

// Partially supports the JSON search grammar.  Explicitly does not support groups.
const getRecordTypes = (searchScope, criteria) => {
  const termName = Object.keys(criteria)[0];
  if (termName == 'iri' || termName == 'id' || termName == null) {
    return null;
  }

  const termConfig = SEARCH_TERM_CONFIG[searchScope][termName];
  const recordTypes = {
    termName,
    types: term2Types[searchScope][termName],
  };

  if (recordTypes.types.length == 0) {
    recordTypes.types = 'No types. Bailing on residual criteria.';
  } else {
    const subTermName = Object.keys(criteria[termName])[0];
    if (subTermName != 'iri' && subTermName != 'id') {
      recordTypes.hop = getRecordTypes(
        termConfig.targetScope ? termConfig.targetScope : searchScope,
        criteria[termName]
      );
    }
  }

  return recordTypes;
};

const relatedListsToTypes = {};
const relatedListKeysByScope = getRelatedListKeys();
Object.keys(relatedListKeysByScope).forEach((searchScope) => {
  if (!relatedListsToTypes[searchScope]) {
    relatedListsToTypes[searchScope] = {};
  }
  relatedListKeysByScope[searchScope].forEach((termName) => {
    const relatedListConfig = getRelatedListConfig(searchScope, termName);
    relatedListConfig.searchConfigs.forEach((searchConfig) => {
      relatedListsToTypes[searchScope][searchConfig.relationKey] =
        getRecordTypes(relatedListConfig.targetScope, searchConfig.criteria);
    });
  });
});
relatedListsToTypes;
