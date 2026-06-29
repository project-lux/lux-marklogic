import { testHelperProxy } from '/test/test-helper.mjs';
import { isCtsExecutionEligible } from '/lib/search/engine.mjs';

const LIB = '0601 isCtsExecutionEligible.mjs';
console.log(`${LIB}: starting.`);

const MOCK_ESTIMATE_QUERY = cts.andQuery([cts.trueQuery()]);

const scenarios = [
  // --- All conditions met → true ---
  {
    name: 'all conditions met',
    input: {
      includeSearchResults: true,
      pageWith: null,
      facetRequests: null,
      scopedCtsQuery: MOCK_ESTIMATE_QUERY,
    },
    expected: true,
  },
  {
    name: 'facetRequests is empty array',
    input: {
      includeSearchResults: true,
      pageWith: null,
      facetRequests: [],
      scopedCtsQuery: MOCK_ESTIMATE_QUERY,
    },
    expected: true,
  },
  {
    name: 'facetRequests is undefined',
    input: {
      includeSearchResults: true,
      pageWith: null,
      facetRequests: undefined,
      scopedCtsQuery: MOCK_ESTIMATE_QUERY,
    },
    expected: true,
  },

  // --- Each condition individually false → false ---
  {
    name: 'includeSearchResults is false',
    input: {
      includeSearchResults: false,
      pageWith: null,
      facetRequests: null,
      scopedCtsQuery: MOCK_ESTIMATE_QUERY,
    },
    expected: false,
  },
  {
    name: 'pageWith is set',
    input: {
      includeSearchResults: true,
      pageWith: 'https://example.com/doc/1',
      facetRequests: null,
      scopedCtsQuery: MOCK_ESTIMATE_QUERY,
    },
    expected: false,
  },
  {
    name: 'facetRequests has entries',
    input: {
      includeSearchResults: true,
      pageWith: null,
      facetRequests: [{ name: 'responsibleUnits' }],
      scopedCtsQuery: MOCK_ESTIMATE_QUERY,
    },
    expected: false,
  },
  {
    name: 'scopedCtsQuery is null (plan requires full materialization)',
    input: {
      includeSearchResults: true,
      pageWith: null,
      facetRequests: null,
      scopedCtsQuery: null,
    },
    expected: false,
  },

  // --- Multiple conditions false simultaneously ---
  {
    name: 'pageWith set and scopedCtsQuery null',
    input: {
      includeSearchResults: true,
      pageWith: 'https://example.com/doc/1',
      facetRequests: null,
      scopedCtsQuery: null,
    },
    expected: false,
  },
  {
    name: 'no search results and facets requested',
    input: {
      includeSearchResults: false,
      pageWith: null,
      facetRequests: [{ name: 'responsibleUnits' }],
      scopedCtsQuery: MOCK_ESTIMATE_QUERY,
    },
    expected: false,
  },
  {
    name: 'all conditions false',
    input: {
      includeSearchResults: false,
      pageWith: 'https://example.com/doc/1',
      facetRequests: [{ name: 'responsibleUnits' }],
      scopedCtsQuery: null,
    },
    expected: false,
  },
];

const assertions = [];

for (const scenario of scenarios) {
  const actual = isCtsExecutionEligible(scenario.input);
  assertions.push(
    testHelperProxy.assertEqual(
      scenario.expected,
      actual,
      `Scenario '${scenario.name}': expected ${scenario.expected}, got ${actual}`,
    ),
  );
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
