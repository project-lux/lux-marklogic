/**
 * Test suite for buildFromSearchPlan (from engine.mjs).
 *
 * Verifies the Opt 20 fromSearch-based plan:
 * - Uses op.fromSearch with the provided scopedCtsQuery
 * - Includes score columns and orderBy when scores are required
 * - Omits score columns when scores are not required
 * - Does NOT include joinDocAndUri (performSearch chains that after pagination)
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { buildFromSearchPlan } from '/lib/search/engine.mjs';
import { SortCriteria } from '/lib/SortCriteria.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0605 buildFromSearchPlan.mjs';
console.log(`${LIB}: starting.`);

const MOCK_SCOPED_CTS_QUERY = cts.andQuery([
  cts.fieldWordQuery('agentAnyText', 'Pablo'),
  cts.fieldValueQuery('anyDataTypeName', ['Person', 'Group']),
]);

// Minimal accumulator with CTS constraints (scoring path).
const ACC_WITH_CTS = {
  ctsConstraints: [cts.fieldWordQuery('agentAnyText', 'Pablo')],
};

// Accumulator with no CTS constraints (non-scoring path).
const ACC_NO_CTS = {
  ctsConstraints: [],
};

// Assembly context indicating score-contributing criteria exist.
const CTX_WITH_SCORES = { hasScoreContributingCriteria: true };

// Assembly context indicating no score-contributing criteria.
const CTX_NO_SCORES = { hasScoreContributingCriteria: false };

const scenarios = [
  // --- Scoring path ---
  {
    name: 'relevance sort with score-contributing criteria includes score and orderBy',
    input: {
      acc: ACC_WITH_CTS,
      assemblyContext: CTX_WITH_SCORES,
      sortCriteria: new SortCriteria('agent', ''),
      scopedCtsQuery: MOCK_SCOPED_CTS_QUERY,
    },
    expected: {
      planContains: ['fromSearch', 'score', 'logtfidf', 'op.desc'],
      planExcludes: ['joinDocAndUri'],
    },
  },

  // --- Non-scoring paths ---
  {
    name: 'relevance sort without score-contributing criteria omits score',
    input: {
      acc: ACC_WITH_CTS,
      assemblyContext: CTX_NO_SCORES,
      sortCriteria: new SortCriteria('agent', ''),
      scopedCtsQuery: MOCK_SCOPED_CTS_QUERY,
    },
    expected: {
      planContains: ['fromSearch', 'fragmentId', 'zero'],
      planExcludes: ['logtfidf', 'op.desc', 'joinDocAndUri'],
    },
  },
  {
    name: 'no CTS constraints omits score even with score-contributing criteria',
    input: {
      acc: ACC_NO_CTS,
      assemblyContext: CTX_WITH_SCORES,
      sortCriteria: new SortCriteria('agent', ''),
      scopedCtsQuery: MOCK_SCOPED_CTS_QUERY,
    },
    expected: {
      planContains: ['fromSearch', 'fragmentId', 'zero'],
      planExcludes: ['logtfidf', 'op.desc', 'joinDocAndUri'],
    },
  },
  {
    name: 'null sortCriteria omits score',
    input: {
      acc: ACC_WITH_CTS,
      assemblyContext: CTX_WITH_SCORES,
      sortCriteria: null,
      scopedCtsQuery: MOCK_SCOPED_CTS_QUERY,
    },
    expected: {
      planContains: ['fromSearch', 'fragmentId', 'zero'],
      planExcludes: ['logtfidf', 'op.desc', 'joinDocAndUri'],
    },
  },

  // --- Never includes joinDocAndUri ---
  {
    name: 'plan never includes joinDocAndUri regardless of scoring',
    input: {
      acc: ACC_WITH_CTS,
      assemblyContext: CTX_WITH_SCORES,
      sortCriteria: new SortCriteria('agent', ''),
      scopedCtsQuery: MOCK_SCOPED_CTS_QUERY,
    },
    expected: {
      planExcludes: ['joinDocAndUri'],
    },
  },

  // --- Non-semantic sort (joinLeftOuter path) ---
  {
    name: 'non-semantic sort joins sort lexicon via joinLeftOuter and collapses by fragmentId',
    input: {
      acc: ACC_WITH_CTS,
      assemblyContext: CTX_WITH_SCORES,
      sortCriteria: new SortCriteria('item', 'itemArchiveSortId'),
      scopedCtsQuery: MOCK_SCOPED_CTS_QUERY,
    },
    expected: {
      planContains: [
        'fromSearch',
        'joinLeftOuter',
        'itemArchiveSortId',
        'groupBy',
        'fragmentId',
        'op.min',
      ],
      planExcludes: ['joinDocAndUri', 'logtfidf'],
    },
  },
  {
    name: 'non-semantic sort ascending produces asc orderBy',
    input: {
      acc: ACC_WITH_CTS,
      assemblyContext: CTX_WITH_SCORES,
      sortCriteria: new SortCriteria('item', 'itemArchiveSortId'),
      scopedCtsQuery: MOCK_SCOPED_CTS_QUERY,
    },
    expected: {
      planContains: ['op.asc', 'itemArchiveSortId', 'fragmentId'],
      planExcludes: ['joinDocAndUri'],
    },
  },
  {
    name: 'non-semantic sort descending produces desc orderBy',
    input: {
      acc: ACC_WITH_CTS,
      assemblyContext: CTX_WITH_SCORES,
      sortCriteria: new SortCriteria('item', 'itemArchiveSortId:desc'),
      scopedCtsQuery: MOCK_SCOPED_CTS_QUERY,
    },
    expected: {
      planContains: ['op.desc', 'itemArchiveSortId', 'op.max', 'fragmentId'],
      planExcludes: ['joinDocAndUri'],
    },
  },
  {
    name: 'non-semantic sort takes precedence over relevance',
    input: {
      acc: ACC_WITH_CTS,
      assemblyContext: CTX_WITH_SCORES,
      sortCriteria: new SortCriteria('item', 'itemArchiveSortId'),
      scopedCtsQuery: MOCK_SCOPED_CTS_QUERY,
    },
    expected: {
      planContains: ['joinLeftOuter', 'itemArchiveSortId'],
      planExcludes: ['logtfidf', 'joinDocAndUri'],
    },
  },
  {
    name: 'non-semantic plus explicit relevance uses score as secondary order key',
    input: {
      acc: ACC_WITH_CTS,
      assemblyContext: CTX_WITH_SCORES,
      sortCriteria: new SortCriteria('item', 'itemArchiveSortId,relevance'),
      scopedCtsQuery: MOCK_SCOPED_CTS_QUERY,
    },
    expected: {
      planContains: [
        'fromSearch',
        'logtfidf',
        'joinLeftOuter',
        'itemArchiveSortId',
        'groupBy',
        'score',
        'op.asc',
        'op.desc',
      ],
      planExcludes: ['joinDocAndUri'],
    },
  },
];

let assertions = [];

for (const scenario of scenarios) {
  const { acc, assemblyContext, sortCriteria, scopedCtsQuery } = scenario.input;
  const plan = buildFromSearchPlan(
    acc,
    assemblyContext,
    sortCriteria,
    scopedCtsQuery,
  );
  const planSource = op.toSource(plan.export());

  if (scenario.expected.planContains) {
    for (const text of scenario.expected.planContains) {
      assertions.push(
        testHelperProxy.assertTrue(
          typeof planSource === 'string' && planSource.includes(text),
          `Scenario '${scenario.name}' - plan should contain '${text}'. Actual: ${planSource}`,
        ),
      );
    }
  }

  if (scenario.expected.planExcludes) {
    for (const text of scenario.expected.planExcludes) {
      assertions.push(
        testHelperProxy.assertFalse(
          typeof planSource === 'string' && planSource.includes(text),
          `Scenario '${scenario.name}' - plan should NOT contain '${text}'. Actual: ${planSource}`,
        ),
      );
    }
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
