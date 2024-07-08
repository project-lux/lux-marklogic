import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { SEARCH_TERM_CONFIG } from '../../config/searchTermConfig.mjs';
import { FACETS_CONFIG } from '../../config/facetsConfig.mjs';
import { SORT_BINDINGS } from '../../config/searchResultsSortConfig.mjs';
import { SearchTermConfig } from '../../lib/SearchTermConfig.mjs';
handleRequest(function () {
  const searchBy = {};
  for (const searchScope of Object.keys(SEARCH_TERM_CONFIG).sort()) {
    searchBy[searchScope] = Object.keys(SEARCH_TERM_CONFIG[searchScope])
      .sort()
      .map((termName) => {
        const termConfig = new SearchTermConfig(
          SEARCH_TERM_CONFIG[searchScope][termName]
        );
        const onlyAcceptsIdTerm = termConfig.onlyAcceptsIdTermAsChild();
        return {
          name: termName,
          targetScope: termConfig.getTargetScopeName() || searchScope,
          acceptsGroup: termConfig.acceptsGroupAsChild(),
          acceptsTerm: termConfig.acceptsTermAsChild(),
          acceptsIdTerm: termConfig.acceptsIdTermAsChild(),
          onlyAcceptsId: onlyAcceptsIdTerm,
          acceptsAtomicValue: termConfig.acceptsAtomicValue(),
          scalarType: termConfig.getScalarType(),
        };
      });
  }

  const facetBy = [];
  Object.keys(FACETS_CONFIG)
    .sort()
    .forEach((name) => {
      const facetConfig = FACETS_CONFIG[name];
      let searchTermName = facetConfig.searchTermName || name;
      let idFacet = searchTermName.endsWith('Id');
      if (idFacet) {
        searchTermName = searchTermName.substring(0, searchTermName.length - 2);
      }
      facetBy.push({
        name,
        searchTermName,
        idFacet,
      });
    });

  return {
    searchBy,
    facetBy,
    sortBy: Object.keys(SORT_BINDINGS).sort(),
  };
});
