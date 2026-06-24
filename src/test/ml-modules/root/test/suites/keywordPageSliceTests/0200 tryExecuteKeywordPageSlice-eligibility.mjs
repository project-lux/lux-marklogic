/**
 * Test suite for tryExecuteKeywordPageSlice eligibility.
 *
 * Rejection scenarios: verify each ineligibility gate returns null using a
 * stub SCP. Acceptance scenarios: verify eligible criteria trigger the
 * page-slice path end-to-end. The test database has the same index
 * configuration as the main content database, so cts.search runs without
 * error but returns 0 rows (no matching documents).
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { tryExecuteKeywordPageSlice } from '/lib/search/keywordPageSlice.mjs';
import { analyzeLeafCriteria } from '/lib/search/engine.mjs';

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
  const ignoredTerms = [];
  let criteriaCount = 0;
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
    addIgnoredTerm: (term) => ignoredTerms.push(term),
    getIgnoredTerms: () => ignoredTerms,
    incrementCriteriaCount: () => criteriaCount++,
    getCriteriaCount: () => criteriaCount,
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

const scenarios = [
  // Rejection scenarios: each overrides one field to trigger a specific gate.
  {
    name: 'Returns null when includeSearchResults is false',
    input: { includeSearchResults: false },
    expected: { error: false, null: true },
  },
  {
    name: 'Returns null when facets are requested',
    input: { facetRequests: [{ name: 'someFacet' }] },
    expected: { error: false, null: true },
  },
  {
    name: "Returns null when searchScope is 'multi'",
    input: { searchScope: 'multi' },
    expected: { error: false, null: true },
  },
  {
    name: 'Returns null when pageWith is set',
    input: { pageWith: 'some-uri' },
    expected: { error: false, null: true },
  },
  {
    name: 'Returns null for non-relevance sort criteria',
    input: { sortCriteria: nonRelevanceSort() },
    expected: { error: false, null: true },
  },
  {
    name: 'Returns null for random sort',
    input: { sortCriteria: randomSort() },
    expected: { error: false, null: true },
  },
  {
    name: 'Returns null when semantic sort option is set',
    input: { sortCriteria: semanticSort() },
    expected: { error: false, null: true },
  },
  {
    name: 'Returns null when scope name is missing',
    input: { searchScope: null },
    expected: { error: false, null: true },
  },
  {
    name: 'Returns null for unsupported criteria shape (OR)',
    input: {
      sortCriteria: relevanceSort(),
      searchCriteria: { OR: [{ text: 'alpha' }, { text: 'beta' }] },
    },
    expected: { error: false, null: true },
  },
  {
    name: 'Returns null when criteria includes non-text child',
    input: {
      sortCriteria: relevanceSort(),
      searchCriteria: { AND: [{ text: 'a' }, { memberOf: { id: 'some-id' } }] },
    },
    expected: { error: false, null: true },
  },
  // Acceptance scenarios: eligible criteria that trigger the page-slice path.
  // The test database has no matching documents, so rows=[] and total=0,
  // but the return is non-null — proving the optimization applied.
  {
    name: 'Single keyword triggers page-slice',
    input: { searchCriteria: { text: 'woman' } },
    expected: { error: false, null: false },
  },
  {
    name: 'Multi-word keyword triggers page-slice (tokenized)',
    input: { searchCriteria: { text: 'woman greek art' } },
    expected: { error: false, null: false },
  },
  {
    name: 'AND of keywords triggers page-slice',
    input: {
      searchCriteria: {
        AND: [{ text: 'woman' }, { text: 'greek' }, { text: 'art' }],
      },
    },
    expected: { error: false, null: false },
  },
  {
    name: 'Keyword with _complete triggers page-slice',
    input: { searchCriteria: { text: 'Pablo Picasso', _complete: true } },
    expected: { error: false, null: false },
  },
  {
    name: 'Keyword with relevance sort triggers page-slice',
    input: {
      sortCriteria: relevanceSort(),
      searchCriteria: { text: 'woman' },
    },
    expected: { error: false, null: false },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = makeStubScp(scenario.input);
    return tryExecuteKeywordPageSlice(scp, analyzeLeafCriteria);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    if (scenario.expected.null) {
      assertions.push(
        testHelperProxy.assertEqual(
          null,
          scenarioResults.actualValue,
          `Scenario '${scenario.name}' should have returned null.`,
        ),
      );
    } else {
      const result = scenarioResults.actualValue;
      assertions.push(
        testHelperProxy.assertNotEqual(
          null,
          result,
          `Scenario '${scenario.name}' returned null — page-slice should have applied.`,
        ),
      );
      assertions.push(
        testHelperProxy.assertTrue(
          Array.isArray(result?.rows),
          `Scenario '${scenario.name}' result.rows should be an array.`,
        ),
      );
    }
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
