const FacetResponses = class {
  #facets;

  constructor(facets) {
    this.#facets = facets;
  }

  getFacets() {
    return this.#facets;
  }

  getFacet(name) {
    return this.#facets[name] ?? null;
  }
};

export { FacetResponses };
