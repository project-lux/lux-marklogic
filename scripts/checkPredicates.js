/*
 * Get an estimated number of *documents* containing *at least* one triple by predicate where
 * the list of predicates come from the backend's search term and keyword search configurations.
 *
 * Purposes of the script include:
 *
 *   1. Find out if a search term is configured to non-existent triples.
 *   2. Find out if some triples are missing (by expected predicate).
 *   3. Find out if some search terms will never return results for some users.
 *   4. Use as input into comparePredicates.js; see that script for this script's configuration.
 *
 * Note there are additional triples in the dataset, such as those with the crm('p2_has_type')
 * predicate.  Those are not included by this script.  One may use comparePredicates.js to
 * draw those out.
 */
import {
  getSearchScopeNames,
  getSearchScopePredicates,
} from '/lib/searchScope';
import { getSearchTermsConfig } from '/config/searchTermsConfig';
import { SORT_BINDINGS } from '/config/searchResultsSortConfig.mjs';
import { START_OF_GENERATED_QUERY as prefixes } from '/lib/SearchCriteriaProcessor';
import * as utils from '/utils/utils';
import { getVersionInfo } from '/lib/environmentLib.mjs';

/* * * START: Script configuration * * */

const usernames = [
  'lux-dev-data-ypm-endpoint-consumer',
  'lux-dev-data-endpoint-consumer',
];
const includeCurrentUser = false;

// Set justZeros to true when you only want to predicates with an estimate of zero.
const justZeros = true;

// When true, only the predicate names are returned, as an array.  This is helpful when using
// this script's output as input to comparePredicates.js.
const formatAsArrayOfPredicates = false;

// Set identifyTerms to true to include the terms in the response (versus just the estimates).
// Forced to false when formatAsArrayOfPredicates is true.
let identifyTerms = false;

/* * * END: Script configuration * * */

// Conditionally override
if (formatAsArrayOfPredicates) {
  identifyTerms = false;
}

if (includeCurrentUser && !usernames.includes(xdmp.getCurrentUser())) {
  usernames.push(xdmp.getCurrentUser());
}

const searchTermsConfig = getSearchTermsConfig();

const resolvePredicate = (predicate) => {
  return xdmp.eval(`${prefixes}${predicate}`);
};

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
          resolvePredicate(predicate)
        );
      });
    }
  });
});

const checkPredicate = (findings, scopeName, termName, predicate) => {
  const recordConfigOnly = findings[predicate];
  if (recordConfigOnly) {
    if (identifyTerms && termName != null) {
      findings[predicate].terms.push(`${scopeName}.${termName}`);
    }
  } else {
    const estimate = cts.estimate(
      cts.jsonPropertyValueQuery('predicate', predicate)
    );
    if ((justZeros && estimate == 0) || !justZeros) {
      if (identifyTerms && termName != null) {
        findings[predicate] = {
          estimate: estimate,
          terms: [`${scopeName}.${termName}`],
        };
      } else {
        findings[predicate] = estimate;
      }
    }
  }
};

const checkPredicates = () => {
  const findings = {};

  // Check all predicates configured to search terms.
  Object.keys(termsWithPredicates).forEach((scopeName) => {
    Object.keys(termsWithPredicates[scopeName]).forEach((termName) => {
      const termConfig = termsWithPredicates[scopeName][termName];
      termConfig.resolvedPredicates.forEach((predicate) => {
        checkPredicate(findings, scopeName, termName, predicate);
      });
    });
  });

  // Add in predicates used by keyword search.
  getSearchScopeNames().forEach((scopeName) => {
    getSearchScopePredicates(scopeName).forEach((predicate) => {
      checkPredicate(findings, scopeName, null, resolvePredicate(predicate));
    });
  });

  // Add in predicates used by sort.
  Object.keys(SORT_BINDINGS).forEach((sortBindingName) => {
    const sortBinding = SORT_BINDINGS[sortBindingName];
    if (sortBinding.predicate) {
      const scopeName = utils.upToFirstUpperCaseCharacter(sortBindingName);
      checkPredicate(findings, scopeName, null, sortBinding.predicate);
    }
  });

  return utils.sortObj(findings);
};

const findings = { versionInfo: getVersionInfo() };
for (const username of usernames) {
  findings[username] = xdmp
    .invokeFunction(checkPredicates, { userId: xdmp.user(username) })
    .toArray()[0];
}
if (formatAsArrayOfPredicates) {
  Object.keys(findings).forEach((username) => {
    findings[username] = Object.keys(findings[username]).sort();
  });
}
findings;
