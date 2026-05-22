/**
 * Test suite for buildSortedResultsPlan via SCP.buildPlans().
 *
 * Tests sort precedence (random > non-semantic > semantic > relevance > unsorted)
 * and that each branch produces distinguishing plan markers.
 *
 * Note: fromSearch is injected by assemblePlan whenever areScoresRequired() is
 * true — that is independent of which sort branch runs. Non-semantic sort
 * coexists with fromSearch because SortCriteria keeps #relevanceSort = true
 * (the default) when non-semantic descriptors are added. Random and semantic
 * sort clear relevance, so their plans do NOT have fromSearch.
 *
 * Uses a keyword text search ('Pablo') so CTS constraints are present — the
 * relevance branch requires them.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0405 buildPlans-buildSortedResultsPlan.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Shared search criteria that produces CTS constraints (needed for relevance sort).
const TEXT_CRITERIA = { _scope: 'agent', text: 'Pablo' };

// Search criteria with no CTS constraints (ID-based, uses indexedValue pattern).
const ID_CRITERIA = {
  _scope: 'agent',
  id: 'https://lux.collections.yale.edu/data/person/mock-id',
};

const scenarios = [
  // --- Precedence tests ---
  {
    name: 'No sort string — defaults to relevance (has CTS constraints)',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      sortedPlanContains: ['fromSearch', 'score'],
      sortedPlanExcludes: ['randomSortCol', 'fromTriples'],
    },
  },
  {
    name: 'Explicit relevance with CTS constraints uses fromSearch',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'relevance',
    },
    expected: {
      error: false,
      sortedPlanContains: ['fromSearch', 'score'],
      sortedPlanExcludes: ['randomSortCol', 'fromTriples'],
    },
  },
  {
    name: 'Relevance without CTS constraints falls through to unsorted',
    input: {
      scopeName: 'agent',
      searchCriteria: ID_CRITERIA,
      sortDelimitedStr: 'relevance',
    },
    expected: {
      error: false,
      sortedPlanExcludes: [
        'fromSearch',
        'score',
        'randomSortCol',
        'fromTriples',
      ],
      sortedMatchesUnsorted: true,
    },
  },
  {
    name: 'Random sort produces random column',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'random',
    },
    expected: {
      error: false,
      sortedPlanContains: ['randomSortCol'],
      sortedPlanExcludes: ['fromSearch', 'score', 'fromTriples'],
    },
  },
  {
    name: 'Random takes precedence over non-semantic',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentActiveDate,random',
    },
    expected: {
      error: false,
      sortedPlanContains: ['randomSortCol'],
      sortedPlanExcludes: [
        'agentActiveStartDateLong',
        'fromSearch',
        'fromTriples',
      ],
    },
  },
  {
    name: 'Random before semantic — random wins',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'random,agentClassificationConceptName',
    },
    expected: {
      error: false,
      sortedPlanContains: ['randomSortCol'],
      sortedPlanExcludes: ['fromTriples', 'fromSearch'],
    },
  },
  {
    name: 'Semantic before random — semantic wins',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentClassificationConceptName,random',
    },
    expected: {
      error: false,
      sortedPlanContains: ['fromTriples'],
      sortedPlanExcludes: ['randomSortCol', 'fromSearch', 'score'],
    },
  },
  {
    name: 'Non-semantic sort adds sort lexicon column alongside fromSearch',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentActiveDate',
    },
    expected: {
      error: false,
      // Non-semantic sort coexists with fromSearch (relevance is still true).
      sortedPlanContains: ['agentActiveStartDateLong', 'fromSearch'],
      sortedPlanExcludes: ['randomSortCol', 'fromTriples'],
    },
  },
  {
    name: 'Semantic sort clears relevance — no fromSearch',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentClassificationConceptName',
    },
    expected: {
      error: false,
      // Semantic sort clears #relevanceSort, so areScoresRequired() = false
      // and assemblePlan skips fromSearch.
      sortedPlanContains: ['fromTriples'],
      sortedPlanExcludes: ['fromSearch', 'score', 'randomSortCol'],
    },
  },
  {
    name: 'Semantic sort after non-semantic — semantic clears non-semantic and relevance',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentActiveDate,agentClassificationConceptName',
    },
    expected: {
      error: false,
      sortedPlanContains: ['fromTriples'],
      sortedPlanExcludes: [
        'agentActiveStartDateLong',
        'randomSortCol',
        'fromSearch',
      ],
    },
  },

  // --- Sort content tests ---
  {
    name: 'Non-semantic descending order produces desc in plan',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentActiveDate:desc',
    },
    expected: {
      error: false,
      sortedPlanContains: ['agentActiveStartDateLong', 'desc'],
    },
  },
  {
    name: 'Multiple non-semantic sorts produce multiple sort columns',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentActiveDate,agentEndDate',
    },
    expected: {
      error: false,
      sortedPlanContains: [
        'agentActiveStartDateLong',
        'agentDiedStartDateLong',
      ],
    },
  },
  {
    name: 'Unsorted plan has no sort markers when no sort criteria',
    input: {
      scopeName: 'agent',
      searchCriteria: ID_CRITERIA,
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      sortedPlanExcludes: [
        'randomSortCol',
        'fromTriples',
        'fromSearch',
        'score',
      ],
      sortedMatchesUnsorted: true,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = new SCP();
    scp.prepare({
      searchCriteria: scenario.input.searchCriteria,
      scopeName: scenario.input.scopeName,
      sortDelimitedStr: scenario.input.sortDelimitedStr,
    });
    const { sortedResultsPlan, unsortedResultsPlan } = scp.buildPlans();
    const sortedSource = op.toSource(sortedResultsPlan.export());
    const unsortedSource = op.toSource(unsortedResultsPlan.export());
    return JSON.stringify({ sortedSource, unsortedSource });
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const { sortedSource, unsortedSource } = JSON.parse(
      scenarioResults.actualValue,
    );
    const e = scenario.expected;
    const p = scenario.name;

    if (e.sortedPlanContains) {
      for (const text of e.sortedPlanContains) {
        assertions.push(
          testHelperProxy.assertTrue(
            typeof sortedSource === 'string' && sortedSource.includes(text),
            `${p}: sorted plan should contain '${text}'`,
          ),
        );
      }
    }

    if (e.sortedPlanExcludes) {
      for (const text of e.sortedPlanExcludes) {
        assertions.push(
          testHelperProxy.assertFalse(
            typeof sortedSource === 'string' && sortedSource.includes(text),
            `${p}: sorted plan should NOT contain '${text}'`,
          ),
        );
      }
    }

    if (e.sortedMatchesUnsorted) {
      assertions.push(
        testHelperProxy.assertEqual(
          unsortedSource,
          sortedSource,
          `${p}: sorted plan should match unsorted plan`,
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
