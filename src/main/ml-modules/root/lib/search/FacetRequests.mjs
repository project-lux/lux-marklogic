import { isDefined } from '../../utils/utils.mjs';
import { FACETS_CONFIG } from '../../config/facetsConfig.mjs';

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
    if (isDefined(FACETS_CONFIG[facetName])) {
      if (facetName.startsWith(scopeName)) {
        const facetRequest = { name: facetName };
        // Electing not to validate given engine's grace.
        if (sort) {
          facetRequest.sort = sort;
        }
        this.#facetRequests.push(facetRequest);
        this.length = this.#facetRequests.length;
      } else {
        throw new BadRequestError(
          `The '${facetName}' facet is not defined in the '${scopeName}' search scope.`,
        );
      }
    } else {
      throw new BadRequestError(`'${facetName}' is not a configured facet.`);
    }
  }

  getFacetRequests() {
    return this.#facetRequests;
  }
};

export { FacetRequests };
