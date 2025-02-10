/*
 * For each search term configured to predicates, determine which record types
 * have triples with those predicates.  Helpful with dataset validation,
 * specifically when comparing the script's output for two datasets.
 */
'use strict';
import { getSearchTermsConfig } from '/config/searchTermsConfig.mjs';
import { START_OF_GENERATED_QUERY } from '/lib/SearchCriteriaProcessor.mjs';
import { getSearchScopeTypes } from '/lib/searchScope.mjs';
import { getVersionInfo } from '/lib/environmentLib.mjs';

const searchTermsConfig = getSearchTermsConfig();
const types = [...new Set(getSearchScopeTypes())].sort();

const predicatesToTypes = { versionInfo: getVersionInfo() };
let allPredicates = [];
for (const searchScope of Object.keys(searchTermsConfig).sort()) {
  Object.keys(searchTermsConfig[searchScope])
    .sort()
    .map((termName) => {
      const termConfig = searchTermsConfig[searchScope][termName];
      if (termConfig.predicates) {
        allPredicates = allPredicates.concat(termConfig.predicates);
      }
    });

  [...new Set(allPredicates.sort())].forEach((predicate) => {
    const predicateIri = eval(`${START_OF_GENERATED_QUERY}; ${predicate}`);
    predicatesToTypes[predicate] = types.filter((type) => {
      return (
        cts.estimate(
          cts.andQuery([
            cts.jsonPropertyValueQuery('dataType', type, ['exact']),
            cts.jsonPropertyValueQuery('predicate', predicateIri, ['exact']),
          ])
        ) > 0
      );
    });
  });
}
predicatesToTypes;
