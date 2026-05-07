const FacetRequests = class {
  #page;
  #pageLength;
  #facetRequests;

  constructor(page, pageLength) {
    this.#page = page;
    this.#pageLength = pageLength;
    this.#facetRequests = [];
  }

  addFacetRequest(facetName, sort = null) {
    const facetRequest = { name: facetName };
    if (sort) {
      facetRequest.sort = sort;
    }
    this.#facetRequests.push(facetRequest);
  }

  getPage() {
    return this.#page;
  }

  getPageLength() {
    return this.#pageLength;
  }

  getFacetRequests() {
    return this.#facetRequests;
  }
};

export { FacetRequests };
