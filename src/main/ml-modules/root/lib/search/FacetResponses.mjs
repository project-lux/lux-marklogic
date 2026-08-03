const FacetResponses = class {
  #facets;

  constructor(facets) {
    this.#facets = facets;
  }

  getFacets() {
    return this.#facets;
  }

  getFacet(name) {
    return this.#facets[name] ?? FacetResponses.getEmptyFacet(name);
  }

  static getEmptyFacet(name) {
    return { facetValues: null, totalItems: null };
  }
};

export { FacetResponses };
