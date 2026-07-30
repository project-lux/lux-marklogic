import { isDefined } from '../../utils/utils.mjs';
import { FACETS_CONFIG } from '../../config/facetsConfig.mjs';
import { SEMANTIC_FACETS_CONFIG } from '../../config/semanticFacetsConfig.mjs';
import { BadRequestError } from '../../lib/errorClasses.mjs';

const FacetRequests = class {
  #page;
  #pageLength;
  #facetRequests;
  length;

  constructor(page, pageLength) {
    this.#page = page;
    this.#pageLength = pageLength;
    this.#facetRequests = [];
    this.length = 0;
  }

  getPage() {
    return this.#page;
  }

  getPageLength() {
    return this.#pageLength;
  }

  addFacetRequest(scopeName, facetName, sort = null) {
    const isSemanticFacet = isDefined(SEMANTIC_FACETS_CONFIG[facetName]);
    const isNonSemanticFacet = isDefined(FACETS_CONFIG[facetName]);
    if (isSemanticFacet || isNonSemanticFacet) {
      // Require the facet be configured to the requested scope.
      if (
        (isSemanticFacet &&
          SEMANTIC_FACETS_CONFIG[facetName].scope !== scopeName) ||
        (isNonSemanticFacet && !facetName.startsWith(scopeName))
      ) {
        throw new BadRequestError(
          `The '${facetName}' facet is not defined in the '${scopeName}' search scope.`,
        );
      }
      const facetRequest = { name: facetName };
      // Electing not to validate given engine's grace.
      if (sort) {
        facetRequest.sort = sort;
      }
      this.#facetRequests.push(facetRequest);
      this.length = this.#facetRequests.length;
    } else {
      throw new BadRequestError(`'${facetName}' is not a configured facet.`);
    }

    return this;
  }

  getFacetRequests() {
    return this.#facetRequests;
  }
};

export { FacetRequests };
