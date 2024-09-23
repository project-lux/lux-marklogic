/*
 * Use this script to get stats from the deployed related lists configuration.
 * Set the database to LUX's content database and execute.  The script does
 * not require any configuration.  Output includes a) number of related lists,
 * b) triple search counts for all related lists, at the search scope level,
 * and for each related list, and c) number of related lists per search scope.
 */
import {
  getRelatedListKeys,
  getRelatedListConfig,
} from '/config/relatedListsConfig.mjs';
const scopesToTermNames = getRelatedListKeys();

const stats = {
  termCount: 0,
  tripleSearches: 0,
  maxTripleSearches: -1,
  minTripleSearches: -1,
  scopes: {},
};
Object.keys(scopesToTermNames).forEach((scope) => {
  const termCount = scopesToTermNames[scope].length;
  stats.termCount += termCount;
  stats.scopes[scope] = {
    termCount: termCount,
    tripleSearches: 0,
  };
  scopesToTermNames[scope].forEach((termName) => {
    const relatedListConfig = getRelatedListConfig(scope, termName);
    const tripleSearches = relatedListConfig.searchConfigs.length;
    stats.tripleSearches += tripleSearches;
    stats.scopes[scope].tripleSearches += tripleSearches;
    stats.scopes[scope][`${termName}Searches`] = tripleSearches;
    if (
      stats.maxTripleSearches == -1 ||
      stats.maxTripleSearches < tripleSearches
    ) {
      stats.maxTripleSearches = tripleSearches;
    }
    if (
      stats.minTripleSearches == -1 ||
      stats.minTripleSearches > tripleSearches
    ) {
      stats.minTripleSearches = tripleSearches;
    }
  });
});
stats;
