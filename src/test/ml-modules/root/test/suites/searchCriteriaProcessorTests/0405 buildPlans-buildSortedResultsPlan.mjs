/**
 * Test suite for buildSortedResultsPlan via SCP.buildPlans().
 *
 * Tests sort precedence (random > non-semantic > semantic > relevance > unsorted)
 * and that each branch produces distinguishing plan markers.
 *
 * Note: fromSearch is injected by assemblePlan only when two conditions are
 * both true:
 *   1. SortCriteria requests scores (default relevance or non-semantic sort)
 *   2. The processed criteria includes at least one score-contributing pattern
 *      (currently keyword or indexedWord)
 *
 * Non-semantic sort can therefore coexist with fromSearch for keyword-style
 * searches, while random and semantic sort clear relevance and skip fromSearch.
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

// Shared search criteria that produces score-contributing CTS constraints.
const TEXT_CRITERIA = { _scope: 'agent', text: 'Pablo' };

// Search criteria with no CTS constraints (ID-based, uses indexedValue pattern).
const ID_CRITERIA = {
  _scope: 'agent',
  id: 'https://lux.collections.yale.edu/data/person/mock-id',
};

// Search criteria with CTS constraints that do not contribute relevance scores.
const NON_SCORING_CTS_CRITERIA = {
  _scope: 'agent',
  OR: [
    { id: 'https://lux.collections.yale.edu/data/person/mock-id-1' },
    { id: 'https://lux.collections.yale.edu/data/person/mock-id-2' },
  ],
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
      orderByContains: ['score'],
      sortedPlanContains: ['fromSearch'],
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
      orderByContains: ['score'],
      sortedPlanContains: ['fromSearch'],
      sortedPlanExcludes: ['randomSortCol', 'fromTriples'],
    },
  },
  {
    name: 'Explicit relevance:desc orders descending (matches default)',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'relevance:desc',
    },
    expected: {
      error: false,
      orderByContains: ['score', 'desc'],
      sortedPlanContains: ['fromSearch'],
      sortedPlanExcludes: ['randomSortCol', 'fromTriples'],
    },
  },
  {
    name: 'Explicit relevance:asc orders ascending instead of descending',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'relevance:asc',
    },
    expected: {
      error: false,
      orderByContains: ['score', 'asc'],
      sortedPlanContains: ['fromSearch'],
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
    name: 'Relevance with non-scoring CTS constraints falls through to unsorted',
    input: {
      scopeName: 'agent',
      searchCriteria: NON_SCORING_CTS_CRITERIA,
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
    name: 'Non-semantic sort adds sort lexicon column via joinLeftOuter',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentActiveDate',
    },
    expected: {
      error: false,
      orderByContains: ['agentActiveStartDateLong'],
      sortedPlanContains: ['joinLeftOuter'],
      sortedPlanExcludes: ['randomSortCol', 'fromTriples'],
    },
  },
  {
    name: 'Non-semantic plus explicit relevance uses score as secondary order',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentActiveDate,relevance',
    },
    expected: {
      error: false,
      orderByContains: ['agentActiveStartDateLong', 'score'],
      sortedPlanContains: ['joinLeftOuter', 'fromSearch'],
      sortedPlanExcludes: ['randomSortCol', 'fromTriples'],
    },
  },
  {
    name: 'Non-semantic desc plus explicit relevance:asc uses ascending score as secondary order',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentActiveDate:desc,relevance:asc',
    },
    expected: {
      error: false,
      orderByContains: ['agentActiveStartDateLong', 'desc', 'score', 'asc'],
      sortedPlanContains: ['joinLeftOuter', 'fromSearch'],
      sortedPlanExcludes: ['randomSortCol', 'fromTriples'],
    },
  },
  {
    name: 'Non-semantic sort with non-scoring CTS constraints skips fromSearch',
    input: {
      scopeName: 'agent',
      searchCriteria: NON_SCORING_CTS_CRITERIA,
      sortDelimitedStr: 'agentActiveDate',
    },
    expected: {
      error: false,
      orderByContains: ['agentActiveStartDateLong'],
      sortedPlanContains: ['joinLeftOuter'],
      sortedPlanExcludes: ['randomSortCol', 'fromTriples', 'fromSearch'],
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
      orderByContains: ['agentActiveStartDateLong', 'desc'],
      sortedPlanContains: ['joinLeftOuter'],
    },
  },
  {
    name: 'Multiple non-semantic sorts produce multiple joinLeftOuter joins',
    input: {
      scopeName: 'agent',
      searchCriteria: TEXT_CRITERIA,
      sortDelimitedStr: 'agentActiveDate,agentEndDate',
    },
    expected: {
      error: false,
      orderByContains: ['agentActiveStartDateLong', 'agentDiedStartDateLong'],
      sortedPlanCounts: {
        joinLeftOuter: 2,
      },
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

  // --- Pure-CTS fold optimization tests ---
  // These lock in the optimization that collapses pure-CTS sub-plans into the
  // parent's ctsConstraints. The signal is `op.fromLexicons`: each non-folded
  // sub-plan adds another call, so an exact count of 1 proves everything
  // folded into the base plan.
  {
    name: 'AND with nested OR (pure CTS) folds into single fromLexicons',
    input: {
      scopeName: 'item',
      searchCriteria: {
        _scope: 'item',
        AND: [{ name: 'box' }, { OR: [{ name: 'red' }, { name: 'blue' }] }],
      },
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      sortedPlanCounts: {
        'op.fromLexicons': 1,
        'cts.orQuery': 1,
      },
    },
  },
  {
    name: 'Two ANDed ORs (pure CTS) both fold into single fromLexicons',
    input: {
      scopeName: 'item',
      searchCriteria: {
        _scope: 'item',
        AND: [
          { OR: [{ name: 'red' }, { name: 'blue' }] },
          { OR: [{ name: 'small' }, { name: 'large' }] },
        ],
      },
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      sortedPlanCounts: {
        // Single fromLexicons + two peer orQuery wrappers under the parent's
        // andQuery prove both sub-plans folded (no andOrSubPlan joins). A
        // joinInner is still present here because default relevance sort
        // joins op.fromSearch for scoring — that's unrelated to the fold.
        'op.fromLexicons': 1,
        'cts.orQuery': 2,
      },
    },
  },
  {
    name: 'NOT-encounters-AND fold preserves negation (regression: was returning 0)',
    input: {
      scopeName: 'item',
      searchCriteria: {
        _scope: 'item',
        AND: [
          { name: 'box' },
          { NOT: [{ name: 'giraffe' }, { recordType: 'DigitalObject' }] },
        ],
      },
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      // Folded; sub must be wrapped as notQuery(orQuery(...)) — without the
      // wrapAs='not' override the sub would be wrapped as a positive orQuery
      // and the AND would silently drop the negation.
      sortedPlanContains: ['cts.notQuery'],
      sortedPlanCounts: {
        'op.fromLexicons': 1,
        'cts.notQuery': 1,
      },
    },
  },
  {
    name: 'OR with nested AND (pure CTS) folds into single fromLexicons',
    input: {
      scopeName: 'item',
      searchCriteria: {
        _scope: 'item',
        OR: [
          { name: 'unique_name_z' }, // forces OR (single-branch collapse off)
          { AND: [{ name: 'red' }, { name: 'small' }] },
        ],
      },
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      sortedPlanCounts: {
        'op.fromLexicons': 1,
        // Inner AND folded as cts.andQuery, wrapped with peer leaf under
        // parent's cts.orQuery.
        'cts.andQuery': 1,
      },
    },
  },

  // --- Score gate edge cases ---
  {
    name: 'Mixed scoring + non-scoring criteria still uses fromSearch',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        _scope: 'agent',
        AND: [{ text: 'Pablo' }, { classification: { name: 'painter' } }],
      },
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      // keyword contributes score → hasScoreContributingCriteria is true
      orderByContains: ['score'],
      sortedPlanContains: ['fromSearch'],
    },
  },
  {
    name: 'IndexedWord pattern contributes relevance score',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', name: 'Picasso' },
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      orderByContains: ['score'],
      sortedPlanContains: ['fromSearch', 'agentName'],
    },
  },
  {
    name: 'Scoring leaf inside nested OR still triggers fromSearch',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        _scope: 'agent',
        AND: [
          { classification: { name: 'painter' } },
          { OR: [{ text: 'Pablo' }, { text: 'Vincent' }] },
        ],
      },
      sortDelimitedStr: '',
    },
    expected: {
      error: false,
      orderByContains: ['score'],
      sortedPlanContains: ['fromSearch'],
    },
  },
  {
    name: 'Only non-scoring patterns with relevance sort falls through to unsorted',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        _scope: 'agent',
        AND: [
          { classification: { name: 'painter' } },
          { nationality: { name: 'Dutch' } },
        ],
      },
      sortDelimitedStr: 'relevance',
    },
    expected: {
      error: false,
      sortedPlanExcludes: ['fromSearch', 'score'],
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

    if (e.sortedPlanCounts) {
      // Map of substring -> expected number of occurrences. Lets us assert
      // plan shape (e.g. exactly one `op.fromLexicons` proves a pure-CTS fold
      // collapsed all sub-plans into the base).
      for (const [text, expected] of Object.entries(e.sortedPlanCounts)) {
        const actual =
          typeof sortedSource === 'string'
            ? sortedSource.split(text).length - 1
            : -1;
        assertions.push(
          testHelperProxy.assertEqual(
            expected,
            actual,
            `${p}: sorted plan should contain '${text}' exactly ${expected} time(s); got ${actual}`,
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
