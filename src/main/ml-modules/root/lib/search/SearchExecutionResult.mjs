import { FacetResponses } from './FacetResponses.mjs';

const PLAN_FORMAT_JSON = 'json';
const PLAN_FORMAT_SOURCE = 'source';

const SearchExecutionResult = class {
  #searchResults;
  #total;
  #resultPage;
  #planAsJson;
  #planAsSource;
  #facetResponses;

  constructor({
    searchResults,
    total,
    resultPage,
    planAsJson,
    planAsSource,
    facetResponses = null,
  }) {
    this.#searchResults = searchResults;
    this.#total = total;
    this.#resultPage = resultPage;
    this.#planAsJson = planAsJson;
    this.#planAsSource = planAsSource;
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

  getPlan(format = PLAN_FORMAT_JSON) {
    if (format === PLAN_FORMAT_SOURCE) {
      return this.#planAsSource;
    }
    return this.#planAsJson;
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

export { PLAN_FORMAT_JSON, PLAN_FORMAT_SOURCE, SearchExecutionResult };
