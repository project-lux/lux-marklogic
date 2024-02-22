/*
 * Produces a report based on configuration that can be handy to include in the release documentation.
 * Run in Query Console.  Paste output into the Word-formatted release doc, then format with a fixed-width font.
 */
import { AUTO_COMPLETE_CONFIG } from '/config/autoCompleteConfig.mjs';
import { getRelatedListKeys } from '/config/relatedListsConfig.mjs';
import { SEARCH_TERM_CONFIG } from '/config/searchTermConfig.mjs';
import { FACETS_CONFIG } from '/config/facetsConfig.mjs';
import { SORT_BINDINGS } from '/config/searchResultsSortConfig.mjs';
import * as utils from '/utils/utils.mjs';

let report = '';

report += '\nSearch By';
report += '\n=========\n';
for (const searchScope of Object.keys(SEARCH_TERM_CONFIG).sort()) {
  report += '\n' + searchScope;
  for (const term of Object.keys(SEARCH_TERM_CONFIG[searchScope]).sort()) {
    report += '\n  ' + term;
  }
}

report += '\n';
report += '\nFacet By';
report += '\n========\n';
for (const name of Object.keys(FACETS_CONFIG).sort()) {
  report += '\n' + name;
}

report += '\n';
report += '\nSort By';
report += '\n=======\n';
for (const name of Object.keys(SORT_BINDINGS).sort()) {
  report += '\n' + name;
}

report += '\n';
report += '\nRelated Lists';
report += '\n=============\n';
const relatedListKeys = utils.sortObj(getRelatedListKeys());
Object.keys(relatedListKeys).forEach((scopeName) => {
  report += '\n' + scopeName;
  report += '\n  ' + relatedListKeys[scopeName].sort().join('\n  ');
});

report += '\n';
report += '\nAuto Complete';
report += '\n=============\n';
for (const name of Object.keys(AUTO_COMPLETE_CONFIG).sort()) {
  report += '\n' + name;
}

report;
