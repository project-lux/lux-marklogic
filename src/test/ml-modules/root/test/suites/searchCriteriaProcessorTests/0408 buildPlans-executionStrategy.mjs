/**
 * Test suite for buildPlans execution strategy (via SCP.buildPlans).
 *
 * Tests the strategy block that determines:
 * - ctsExecutionEligible: whether cts.estimate + offset/limit can replace
 *   full materialization
 * - ctsSearchOptions: when non-null, cts.search executes with these options
 *   instead of the Optic plan (Opt 26). Null only for semantic sort.
 * - scopedCtsQuery: the composed CTS query used for cts.estimate/cts.search
 *
 * Now that SCP.buildPlans() forwards includeSearchResults, pageWith, and
 * facetRequests to engine.buildPlans(), the strategy block activates and
 * all six return properties are populated.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0408 buildPlans-executionStrategy.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Simple text search — join-free, produces CTS constraints and scores.
const TEXT_CRITERIA = { _scope: 'agent', text: 'Pablo' };

const MOCK_PERSON_IRI =
  'https://lux.collections.yale.edu/data/person/e17df9e9-7254-409f-98c3-7c2fb3e73cd1';

// Single-level hop — gets CTS-optimized into tripleRangeQuery (no joins).
const CTS_OPTIMIZED_HOP_CRITERIA = {
  _scope: 'item',
  producedBy: { id: MOCK_PERSON_IRI },
};

// Multi-level hop — produces joins, making scopedCtsQuery null.
const MULTI_HOP_CRITERIA = {
  _scope: 'event',
  used: {
    containingItem: {
      producedBy: { id: MOCK_PERSON_IRI },
    },
  },
};

const scenarios = [
  // --- Opt 26: cts.search path (CTS-eligible, non-semantic sort) ---
  {
    name: 'text search, default relevance sort → Opt 26 cts.search',
    input: {
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      ctsExecutionEligible: true,
      ctsSearchOptionsNonNull: true,
      scopedCtsQueryNonNull: true,
    },
  },
  {
    name: 'text search, explicit relevance sort → Opt 26 cts.search',
    input: {
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'relevance',
    },
    expected: {
      error: false,
      ctsExecutionEligible: true,
      ctsSearchOptionsNonNull: true,
      scopedCtsQueryNonNull: true,
    },
  },
  {
    name: 'CTS-optimized single-level hop → Opt 26 cts.search',
    input: {
      searchCriteria: CTS_OPTIMIZED_HOP_CRITERIA,
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      ctsExecutionEligible: true,
      ctsSearchOptionsNonNull: true,
      scopedCtsQueryNonNull: true,
    },
  },
  {
    name: 'text search, lexicon sort → Opt 26 cts.search',
    input: {
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentStartDate',
    },
    expected: {
      error: false,
      ctsExecutionEligible: true,
      ctsSearchOptionsNonNull: true,
      scopedCtsQueryNonNull: true,
    },
  },
  {
    name: 'text search, random sort → Opt 26 cts.search',
    input: {
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'random',
    },
    expected: {
      error: false,
      ctsExecutionEligible: true,
      ctsSearchOptionsNonNull: true,
      scopedCtsQueryNonNull: true,
    },
  },

  // --- Opt 18: eligible but semantic sort requires Optic ---
  {
    name: 'text search, semantic sort → Opt 18 (ctsSearchOptions null)',
    input: {
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentClassificationConceptName',
    },
    expected: {
      error: false,
      ctsExecutionEligible: true,
      ctsSearchOptionsNonNull: false,
      scopedCtsQueryNonNull: true,
      selectedPlanContains: ['fromLexicons'],
    },
  },

  // --- Full materialization: not eligible ---
  {
    name: 'multi-level hop (join-dependent) → full materialization',
    input: {
      searchCriteria: MULTI_HOP_CRITERIA,
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      ctsExecutionEligible: false,
      ctsSearchOptionsNonNull: false,
      scopedCtsQueryNonNull: false,
    },
  },
  {
    name: 'text search with pageWith set → full materialization',
    input: {
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: '',
      pageWith: 'https://lux.collections.yale.edu/data/person/mock-id',
    },
    expected: {
      error: false,
      ctsExecutionEligible: false,
      ctsSearchOptionsNonNull: false,
      scopedCtsQueryNonNull: true,
    },
  },

  // --- includeSearchResults: false → not eligible ---
  {
    name: 'includeSearchResults false → not eligible',
    input: {
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: '',
      includeSearchResults: false,
    },
    expected: {
      error: false,
      ctsExecutionEligible: false,
      ctsSearchOptionsNonNull: false,
    },
  },

  // --- scopedCtsQuery correctness ---
  {
    name: 'scopedCtsQuery includes scope type filter and text constraint',
    input: {
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      scopedCtsQueryNonNull: true,
      scopedCtsQueryContains: ['anyDataTypeName', 'agentAnyText', 'Pablo'],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = new SCP();
    // Clone criteria — prepare() deletes _scope from the object after reading it.
    const criteria = { ...scenario.input.searchCriteria };
    scp.prepare({
      searchCriteria: criteria,
      sortDelimitedStr: scenario.input.sortDelimitedStr,
      pageWith: scenario.input.pageWith || null,
      includeSearchResults:
        scenario.input.includeSearchResults !== undefined
          ? scenario.input.includeSearchResults
          : true,
    });
    const result = scp.buildPlans();
    return {
      ctsExecutionEligible: result.ctsExecutionEligible,
      ctsSearchOptions: result.ctsSearchOptions,
      scopedCtsQuery: result.scopedCtsQuery,
      selectedPlanSource: result.selectedPlan
        ? op.toSource(result.selectedPlan.export())
        : null,
      scopedCtsQueryStr: result.scopedCtsQuery
        ? xdmp.quote(result.scopedCtsQuery)
        : null,
    };
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const actual = scenarioResults.actualValue;

    if (scenario.expected.ctsExecutionEligible !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.ctsExecutionEligible,
          actual.ctsExecutionEligible,
          `Scenario '${scenario.name}' - ctsExecutionEligible should be ${scenario.expected.ctsExecutionEligible}`,
        ),
      );
    }

    if (scenario.expected.ctsSearchOptionsNonNull !== undefined) {
      const optionsNonNull = actual.ctsSearchOptions != null;
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.ctsSearchOptionsNonNull,
          optionsNonNull,
          `Scenario '${scenario.name}' - ctsSearchOptions ${scenario.expected.ctsSearchOptionsNonNull ? 'should' : 'should not'} be non-null`,
        ),
      );
    }

    if (scenario.expected.scopedCtsQueryNonNull !== undefined) {
      const queryIsNonNull = actual.scopedCtsQuery != null;
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.scopedCtsQueryNonNull,
          queryIsNonNull,
          `Scenario '${scenario.name}' - scopedCtsQuery ${scenario.expected.scopedCtsQueryNonNull ? 'should' : 'should not'} be non-null`,
        ),
      );
    }

    if (scenario.expected.selectedPlanContains) {
      for (const text of scenario.expected.selectedPlanContains) {
        assertions.push(
          testHelperProxy.assertTrue(
            typeof actual.selectedPlanSource === 'string' &&
              actual.selectedPlanSource.includes(text),
            `Scenario '${scenario.name}' - selectedPlan should contain '${text}'. Actual: ${actual.selectedPlanSource}`,
          ),
        );
      }
    }

    if (scenario.expected.selectedPlanExcludes) {
      for (const text of scenario.expected.selectedPlanExcludes) {
        assertions.push(
          testHelperProxy.assertFalse(
            typeof actual.selectedPlanSource === 'string' &&
              actual.selectedPlanSource.includes(text),
            `Scenario '${scenario.name}' - selectedPlan should NOT contain '${text}'. Actual: ${actual.selectedPlanSource}`,
          ),
        );
      }
    }

    if (scenario.expected.scopedCtsQueryContains) {
      for (const text of scenario.expected.scopedCtsQueryContains) {
        assertions.push(
          testHelperProxy.assertTrue(
            typeof actual.scopedCtsQueryStr === 'string' &&
              actual.scopedCtsQueryStr.includes(text),
            `Scenario '${scenario.name}' - scopedCtsQuery should contain '${text}'. Actual: ${actual.scopedCtsQueryStr}`,
          ),
        );
      }
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
