/*
 * For each search term configured to predicates, determine which record
 * types triples with those predicates are defined in.
 *
 * Originally developed while assessing a risk that getRecordTypesByRelatedListSearches.js
 * discusses.  The output of this script is used by that script.
 *
 * An additional use of it could be to verify search terms are configured to
 * predicates that exist, whether executed when the dataset or search term
 * configuration changes.
 *
 * This script is relatively slow given the number of times it calls cts.estimate.
 * In April 2024, this script took 10 seconds to run in SBX.
 */
'use strict';
import { getSearchTermsConfig } from '/config/searchTermsConfig.mjs';
import { START_OF_GENERATED_QUERY } from '/lib/SearchCriteriaProcessor.mjs';
import { getSearchScopeTypes } from '/lib/searchScope.mjs';
import { getVersionInfo } from '/utils/utils.mjs';

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
