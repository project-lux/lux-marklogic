import { FacetResponses } from '/lib/search/FacetResponses.mjs';

const SearchExecutionResult = class {
  #searchResults;
  #total;
  #resultPage;
  #facetResponses;

  constructor({ searchResults, total, resultPage, facetResponses = null }) {
    this.#searchResults = searchResults;
    this.#total = total;
    this.#resultPage = resultPage;
    this.#facetResponses = facetResponses;
  }

  getSearchResults() {
    return this.#searchResults;
  }

  getTotal() {
    return this.#total;
  }

  getResultPage() {
    return this.#resultPage;
  }

  getFacets() {
    return this.#facetResponses;
  }

  // Convenience method to get a specific facet
  getFacet(name) {
    return (
      this.#facetResponses?.getFacet(name) ?? FacetResponses.getEmptyFacet(name)
    );
  }
};

export { SearchExecutionResult };
