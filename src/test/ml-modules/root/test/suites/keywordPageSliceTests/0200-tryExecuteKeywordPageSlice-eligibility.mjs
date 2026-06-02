/**
 * Test suite for the eligibility short-circuits in tryExecuteKeywordPageSlice.
 *
 * Every rejection path returns null without invoking MarkLogic indexes, so a
 * stub SearchCriteriaProcessor with the right getters is sufficient. The
 * happy-path execution (cts.search + op.fromParam hydration) is covered by
 * the parity script in scratch/performance/woman-greek-art-memberOf/.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { tryExecuteKeywordPageSlice } from '/lib/search/keywordPageSlice.mjs';

const LIB = '0200-tryExecuteKeywordPageSlice-eligibility.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Defaults that, on their own, would pass every eligibility gate up to the
// point where cts.search would run. Each scenario overrides one field to
// drive a specific rejection path.
function makeStubScp(overrides = {}) {
  const defaults = {
    includeSearchResults: true,
    facetRequests: [],
    allowMultiScope: false,
    pageWith: null,
    sortCriteria: null,
    searchScope: 'item',
    searchCriteria: { text: 'woman' },
    page: 1,
    pageLength: 20,
  };
  const state = { ...defaults, ...overrides };
  return {
    getIncludeSearchResults: () => state.includeSearchResults,
    getFacetRequests: () => state.facetRequests,
    isAllowMultiScope: () => state.allowMultiScope,
    getPageWith: () => state.pageWith,
    getSortCriteria: () => state.sortCriteria,
    getSearchScope: () => state.searchScope,
    getSearchCriteria: () => state.searchCriteria,
    getPage: () => state.page,
    getPageLength: () => state.pageLength,
  };
}

function relevanceSort() {
  return {
    isRelevanceSort: () => true,
    isRandomSort: () => false,
    hasSemanticSortOption: () => false,
    hasNonSemanticSortDescriptors: () => false,
  };
}
function randomSort() {
  return {
    isRelevanceSort: () => false,
    isRandomSort: () => true,
    hasSemanticSortOption: () => false,
    hasNonSemanticSortDescriptors: () => false,
  };
}
function nonRelevanceSort() {
  return {
    isRelevanceSort: () => false,
    isRandomSort: () => false,
    hasSemanticSortOption: () => false,
    hasNonSemanticSortDescriptors: () => true,
  };
}
function semanticSort() {
  return {
    isRelevanceSort: () => true,
    isRandomSort: () => false,
    hasSemanticSortOption: () => true,
    hasNonSemanticSortDescriptors: () => false,
  };
}

// Each scenario constructs an scp stub and asserts that the function returns
// null. Happy-path execution is intentionally out of scope (requires indexes).
const scenarios = [
  {
    name: 'Returns null when includeSearchResults is false',
    overrides: { includeSearchResults: false },
  },
  {
    name: 'Returns null when facets are requested',
    overrides: { facetRequests: [{ name: 'someFacet' }] },
  },
  {
    name: "Returns null when searchScope is 'multi'",
    overrides: { searchScope: 'multi' },
  },
  {
    name: 'Returns null when pageWith is set',
    overrides: { pageWith: 'some-uri' },
  },
  {
    name: 'Returns null for non-relevance sort criteria',
    overrides: { sortCriteria: nonRelevanceSort() },
  },
  {
    name: 'Returns null for random sort',
    overrides: { sortCriteria: randomSort() },
  },
  {
    name: 'Returns null when semantic sort option is set',
    overrides: { sortCriteria: semanticSort() },
  },
  {
    name: 'Returns null when scope name is missing',
    overrides: { searchScope: null },
  },
  {
    name: 'Returns null for unsupported criteria shape (OR)',
    overrides: {
      sortCriteria: relevanceSort(),
      searchCriteria: { OR: [{ text: 'a' }, { text: 'b' }] },
    },
  },
  {
    name: 'Returns null when criteria includes non-text child',
    overrides: {
      sortCriteria: relevanceSort(),
      searchCriteria: { AND: [{ text: 'a' }, { memberOf: 'uri' }] },
    },
  },
];

for (const scenario of scenarios) {
  const adapted = {
    name: scenario.name,
    expected: { error: false, value: null },
  };
  const zeroArityFun = () => {
    const scp = makeStubScp(scenario.overrides);
    return tryExecuteKeywordPageSlice(scp);
  };
  const scenarioResults = executeScenario(adapted, zeroArityFun);
  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        null,
        scenarioResults.actualValue,
        `Scenario '${scenario.name}' did not return null.`,
      ),
    );
  }
  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
