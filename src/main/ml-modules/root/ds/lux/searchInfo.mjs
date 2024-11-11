import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { getSearchTermsConfig } from '../../config/searchTermsConfig.mjs';
import { FACETS_CONFIG } from '../../config/facetsConfig.mjs';
import { SORT_BINDINGS } from '../../config/searchResultsSortConfig.mjs';
import { SearchTermConfig } from '../../lib/SearchTermConfig.mjs';
handleRequest(function () {
  const searchTermsConfig = getSearchTermsConfig();
  const searchBy = {};
  for (const searchScope of Object.keys(searchTermsConfig).sort()) {
    searchBy[searchScope] = Object.keys(searchTermsConfig[searchScope])
      .sort()
      .map((termName) => {
        const termConfig = new SearchTermConfig(
          searchTermsConfig[searchScope][termName]
        );
        return {
          name: termName,
          targetScope: termConfig.getTargetScopeName() || searchScope,
          acceptsGroup: termConfig.acceptsGroupAsChild(),
          acceptsTerm: termConfig.acceptsTermAsChild(),
          acceptsIdTerm: termConfig.acceptsIdTermAsChild(),
          acceptsAtomicValue: termConfig.acceptsAtomicValue(),
          scalarType: termConfig.getScalarType(),
        };
      });
  }

  const facetBy = Object.keys(FACETS_CONFIG)
    .sort()
    .map((name) => {
      const facetConfig = FACETS_CONFIG[name];
      let searchTermName = facetConfig.searchTermName || name;
      let idFacet = searchTermName.endsWith('Id');
      if (idFacet) {
        searchTermName = searchTermName.substring(0, searchTermName.length - 2);
      }
      return {
        name,
        searchTermName,
        idFacet,
      };
    });

  const sortBy = Object.keys(SORT_BINDINGS)
    .sort()
    .map((name) => {
      return {
        name,
        type: SORT_BINDINGS[name].subSorts ? 'multiScope' : 'singleScope',
      };
    });

  return {
    searchBy,
    facetBy,
    sortBy,
  };
});
