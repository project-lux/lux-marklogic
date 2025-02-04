/*
 * Set the output of this script to the term2Types variable in
 * getRecordTypesByRelatedListSearches.js
 */
'use strict';
import { getSearchTermsConfig } from '/config/searchTermsConfig.mjs';
import { START_OF_GENERATED_QUERY } from '/lib/SearchCriteriaProcessor.mjs';
import { getSearchScopeTypes } from '/lib/searchScope.mjs';
import { getVersionInfo } from '/lib/environmentLib.mjs';

const searchTermsConfig = getSearchTermsConfig();
const types = [...new Set(getSearchScopeTypes())].sort();

const termToTypes = { versionInfo: getVersionInfo() };
for (const searchScope of Object.keys(searchTermsConfig).sort()) {
  if (!termToTypes[searchScope]) {
    termToTypes[searchScope] = {};
  }
  Object.keys(searchTermsConfig[searchScope])
    .sort()
    .map((termName) => {
      const termConfig = searchTermsConfig[searchScope][termName];
      if (termConfig.predicates) {
        termConfig.predicates.forEach((predicate) => {
          const predicateIri = eval(
            `${START_OF_GENERATED_QUERY}; ${predicate}`
          );
          termToTypes[searchScope][termName] = types.filter((type) => {
            return (
              cts.estimate(
                cts.andQuery([
                  cts.jsonPropertyValueQuery('dataType', type, ['exact']),
                  cts.jsonPropertyValueQuery('predicate', predicateIri, [
                    'exact',
                  ]),
                ])
              ) > 0
            );
          });
        });
      }
    });
}
termToTypes;
