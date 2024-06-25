import { FACETS_CONFIG } from '../config/facetsConfig.mjs';

function facetToScopeAndTermName(facetName) {
  const matchArr = facetName.match('([a-z]+)([^a-z])(.*)');
  if (matchArr && matchArr.length === 4) {
    const scopeName = matchArr[1];

    // Give precedence to the facet's searchTermName property; else, derive from the facet's name.
    let termName =
      FACETS_CONFIG[facetName].searchTermName ||
      matchArr[2].toLowerCase().concat(matchArr[3]);
    // Grace for searchTermName values that should end with 'Id', even though those are child terms.
    if (facetName.endsWith('Id') && !termName.endsWith('Id')) {
      termName += 'Id';
    }
    return { scopeName, termName };
  } else {
    const msg = `Unable to derive search scope and term name from facet name: ${facetName}`;
    console.error(msg);
    throw new Error(msg);
  }
}

export { facetToScopeAndTermName };
