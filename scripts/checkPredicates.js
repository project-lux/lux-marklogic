/*
 * Get an estimated number of *documents* containing *at least* one triple by predicate where
 * the list of predicates come from the backend's search term configuration.
 *
 * Note there are additional triples in the dataset, such as those with the crm('p2_has_type')
 * predicate.
 *
 * Use justEstimates to only return the estimates or also the search terms that are
 * configured to the predicate.
 */
import { SEARCH_TERM_CONFIG as config } from '/config/searchTermConfig';
import { START_OF_GENERATED_QUERY as prefixes } from '/lib/SearchCriteriaProcessor';
import * as utils from '/utils/utils';

const justEstimates = true;

const findings = {};
const estimate = (predicate) => {
  return cts.estimate(
    cts.jsonPropertyValueQuery(
      'predicate',
      xdmp.eval(`${prefixes}${predicate}`)
    )
  );
};
const allDoubleQuotesRegExp = new RegExp('"', 'g');
Object.keys(config).forEach((scopeName) => {
  Object.keys(config[scopeName]).forEach((termName) => {
    const termConfig = config[scopeName][termName];
    if (utils.isNonEmptyArray(termConfig.predicates)) {
      termConfig.predicates.forEach((predicate) => {
        predicate = predicate.replace(allDoubleQuotesRegExp, "'"); // for readability
        if (justEstimates) {
          if (!findings[predicate]) {
            findings[predicate] = estimate(predicate);
          }
        } else {
          if (!findings[predicate]) {
            findings[predicate] = {
              estimate: estimate(predicate),
              terms: [],
            };
          }
          findings[predicate].terms.push(`${scopeName}.${termName}`);
        }
      });
    }
  });
});

utils.sortObj(findings);
