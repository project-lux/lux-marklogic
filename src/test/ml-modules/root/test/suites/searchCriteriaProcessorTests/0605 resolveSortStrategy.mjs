/**
 * Test suite for resolveSortStrategy (from engine.mjs).
 *
 * Verifies sort precedence resolution into a strategy descriptor:
 * - Random > Non-semantic > Semantic > Relevance > Unsorted
 * - includeRelevance flag set correctly for non-semantic sorts
 * - Falls through to unsorted when scoring conditions are not met
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { resolveSortStrategy } from '/lib/search/engine.mjs';
import { SortCriteria } from '/lib/SortCriteria.mjs';

const LIB = '0605 resolveSortStrategy.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'default relevance sort with scoring criteria → relevance',
    input: {
      sortCriteria: new SortCriteria('agent', ''),
      hasScoreContributingCriteria: true,
      hasCtsConstraints: true,
    },
    expected: { type: 'relevance' },
  },
  {
    name: 'explicit relevance sort → relevance',
    input: {
      sortCriteria: new SortCriteria('agent', 'relevance'),
      hasScoreContributingCriteria: true,
      hasCtsConstraints: true,
    },
    expected: { type: 'relevance' },
  },
  {
    name: 'relevance without score-contributing criteria → unsorted',
    input: {
      sortCriteria: new SortCriteria('agent', ''),
      hasScoreContributingCriteria: false,
      hasCtsConstraints: true,
    },
    expected: { type: 'unsorted' },
  },
  {
    name: 'relevance without CTS constraints → unsorted',
    input: {
      sortCriteria: new SortCriteria('agent', ''),
      hasScoreContributingCriteria: true,
      hasCtsConstraints: false,
    },
    expected: { type: 'unsorted' },
  },
  {
    name: 'random sort → random',
    input: {
      sortCriteria: new SortCriteria('agent', 'random'),
      hasScoreContributingCriteria: true,
      hasCtsConstraints: true,
    },
    expected: { type: 'random' },
  },
  {
    name: 'non-semantic field sort → nonSemantic',
    input: {
      sortCriteria: new SortCriteria('item', 'itemArchiveSortId'),
      hasScoreContributingCriteria: true,
      hasCtsConstraints: true,
    },
    expected: { type: 'nonSemantic' },
  },
  {
    name: 'non-semantic with explicit relevance → nonSemantic with includeRelevance',
    input: {
      sortCriteria: new SortCriteria('item', 'itemArchiveSortId,relevance'),
      hasScoreContributingCriteria: true,
      hasCtsConstraints: true,
    },
    expected: { type: 'nonSemantic', includeRelevance: true },
  },
  {
    name: 'non-semantic without scoring criteria → nonSemantic without includeRelevance',
    input: {
      sortCriteria: new SortCriteria('item', 'itemArchiveSortId,relevance'),
      hasScoreContributingCriteria: false,
      hasCtsConstraints: true,
    },
    expected: { type: 'nonSemantic', includeRelevance: false },
  },
  {
    name: 'semantic sort → semantic',
    input: {
      sortCriteria: new SortCriteria('agent', 'agentClassificationConceptName'),
      hasScoreContributingCriteria: true,
      hasCtsConstraints: true,
    },
    expected: { type: 'semantic' },
  },
  {
    name: 'null sortCriteria → unsorted',
    input: {
      sortCriteria: null,
      hasScoreContributingCriteria: true,
      hasCtsConstraints: true,
    },
    expected: { type: 'unsorted' },
  },
];

for (const scenario of scenarios) {
  const result = resolveSortStrategy(scenario.input);

  assertions.push(
    testHelperProxy.assertEqual(
      scenario.expected.type,
      result.type,
      `resolveSortStrategy '${scenario.name}': expected type '${scenario.expected.type}', got '${result.type}'`,
    ),
  );

  if (scenario.expected.includeRelevance !== undefined) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.includeRelevance,
        result.includeRelevance,
        `resolveSortStrategy '${scenario.name}': includeRelevance should be ${scenario.expected.includeRelevance}`,
      ),
    );
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
