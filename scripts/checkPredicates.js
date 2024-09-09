/*
 * Get an estimated number of *documents* containing *at least* one triple by predicate where
 * the list of predicates come from the backend's search term configuration.
 *
 * Purposes of the script include:
 *
 *   1. Find out if a search term is configured to non-existent triples.
 *   2. Find out if some triples are missing (by expected predicate).
 *   3. Find out if some search terms will never return results for some users.
 *
 * Note there are additional triples in the dataset, such as those with the crm('p2_has_type')
 * predicate.  Those are not included by this script.
 */
import { getSearchTermsConfig } from '/config/searchTermsConfig';
import { START_OF_GENERATED_QUERY as prefixes } from '/lib/SearchCriteriaProcessor';
import * as utils from '/utils/utils';

/* * * START: Script configuration * * */

const usernames = [
  'lux-dev-data-ypm-endpoint-consumer',
  'lux-dev-data-endpoint-consumer',
];
const includeCurrentUser = false;

// Set justZeros to true when you only want to predicates with an estimate of zero.
const justZeros = true;

// Set identifyTerms to true to include the terms in the response (versus just the estimates).
const identifyTerms = false;

/* * * END: Script configuration * * */

if (includeCurrentUser && !usernames.includes(xdmp.getCurrentUser())) {
  usernames.push(xdmp.getCurrentUser());
}

const searchTermsConfig = getSearchTermsConfig();

// Create a scopeName-termName object of terms with predicates.
const termsWithPredicates = {};
const allDoubleQuotesRegExp = new RegExp('"', 'g');
Object.keys(searchTermsConfig).forEach((scopeName) => {
  termsWithPredicates[scopeName] = {};
  Object.keys(searchTermsConfig[scopeName]).forEach((termName) => {
    const termConfig = searchTermsConfig[scopeName][termName];
    if (utils.isNonEmptyArray(termConfig.predicates)) {
      termsWithPredicates[scopeName][termName] = termConfig;
      termsWithPredicates[scopeName][termName].resolvedPredicates = [];
      termConfig.predicates.forEach((predicate) => {
        predicate = predicate.replace(allDoubleQuotesRegExp, "'"); // for readability
        termsWithPredicates[scopeName][termName].resolvedPredicates.push(
          xdmp.eval(`${prefixes}${predicate}`)
        );
      });
    }
  });
});

const checkPredicates = () => {
  const findings = {};
  Object.keys(termsWithPredicates).forEach((scopeName) => {
    Object.keys(termsWithPredicates[scopeName]).forEach((termName) => {
      const termConfig = termsWithPredicates[scopeName][termName];
      termConfig.resolvedPredicates.forEach((predicate) => {
        const recordConfigOnly = findings[predicate];
        if (recordConfigOnly) {
          if (identifyTerms) {
            findings[predicate].terms.push(`${scopeName}.${termName}`);
          }
        } else {
          const estimate = cts.estimate(
            cts.jsonPropertyValueQuery('predicate', predicate)
          );
          if ((justZeros && estimate == 0) || !justZeros) {
            if (identifyTerms) {
              findings[predicate] = {
                estimate: estimate,
                terms: [`${scopeName}.${termName}`],
              };
            } else {
              findings[predicate] = estimate;
            }
          }
        }
      });
    });
  });
  return utils.sortObj(findings);
};

const findings = {};
for (const username of usernames) {
  findings[username] = xdmp
    .invokeFunction(checkPredicates, { userId: xdmp.user(username) })
    .toArray()[0];
}
findings;
