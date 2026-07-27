/**
 * Test suite for buildCtsSearchOptions (from engine.mjs).
 *
 * Verifies Opt 26 cts.search options construction:
 * - Returns null only for semantic sort (requires Optic)
 * - Includes 'unfiltered' in all non-null results
 * - Includes 'score-random' for random sort
 * - Includes cts.indexOrder for non-semantic field sorts
 * - Includes cts.scoreOrder for relevance
 * - Includes 'score-zero' when scores are not needed
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { buildCtsSearchOptions } from '/lib/search/engine.mjs';

const LIB = '0608 buildCtsSearchOptions.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'unsorted → [unfiltered, score-zero]',
    input: { type: 'unsorted' },
    expected: {
      nonNull: true,
      contains: ['unfiltered', 'score-zero'],
      excludes: ['score-random'],
      length: 2,
    },
  },
  {
    name: 'relevance → [unfiltered, scoreOrder]',
    input: { type: 'relevance' },
    expected: {
      nonNull: true,
      contains: ['unfiltered'],
      excludes: ['score-zero', 'score-random'],
      length: 2,
    },
  },
  {
    name: 'relevance descending (explicit) → scoreOrder descending',
    input: { type: 'relevance', order: 'descending' },
    expected: {
      nonNull: true,
      contains: ['unfiltered', 'descending'],
      excludes: ['score-zero', 'score-random', 'ascending'],
      length: 2,
    },
  },
  {
    name: 'relevance ascending → scoreOrder ascending',
    input: { type: 'relevance', order: 'ascending' },
    expected: {
      nonNull: true,
      contains: ['unfiltered', 'ascending'],
      excludes: ['score-zero', 'score-random', 'descending'],
      length: 2,
    },
  },
  {
    name: 'random → [unfiltered, score-random]',
    input: { type: 'random' },
    expected: {
      nonNull: true,
      contains: ['unfiltered', 'score-random'],
      excludes: ['score-zero'],
      length: 2,
    },
  },
  {
    name: 'nonSemantic without relevance → [unfiltered, indexOrder, score-zero]',
    input: {
      type: 'nonSemantic',
      descriptors: [
        { indexReference: 'itemArchiveSortId', order: 'ascending' },
      ],
      includeRelevance: false,
    },
    expected: {
      nonNull: true,
      contains: ['unfiltered', 'score-zero'],
      excludes: ['score-random'],
      length: 3,
    },
  },
  {
    name: 'nonSemantic with relevance → [unfiltered, indexOrder, scoreOrder]',
    input: {
      type: 'nonSemantic',
      descriptors: [
        { indexReference: 'itemArchiveSortId', order: 'ascending' },
      ],
      includeRelevance: true,
    },
    expected: {
      nonNull: true,
      contains: ['unfiltered'],
      excludes: ['score-zero', 'score-random'],
      length: 3,
    },
  },
  {
    name: 'nonSemantic with ascending relevanceOrder (descriptor descending) → scoreOrder ascending',
    input: {
      type: 'nonSemantic',
      descriptors: [
        { indexReference: 'itemArchiveSortId', order: 'descending' },
      ],
      includeRelevance: true,
      relevanceOrder: 'ascending',
    },
    expected: {
      nonNull: true,
      contains: ['unfiltered', 'ascending', 'descending'],
      excludes: ['score-zero', 'score-random'],
      length: 3,
    },
  },
  {
    name: 'nonSemantic desc → indexOrder descending',
    input: {
      type: 'nonSemantic',
      descriptors: [
        { indexReference: 'itemArchiveSortId', order: 'descending' },
      ],
      includeRelevance: false,
    },
    expected: {
      nonNull: true,
      contains: ['unfiltered', 'score-zero'],
      length: 3,
    },
  },
  {
    name: 'nonSemantic multiple fields → one indexOrder per field',
    input: {
      type: 'nonSemantic',
      descriptors: [
        { indexReference: 'itemArchiveSortId', order: 'ascending' },
        { indexReference: 'anySortName', order: 'descending' },
      ],
      includeRelevance: false,
    },
    expected: {
      nonNull: true,
      contains: ['unfiltered', 'score-zero'],
      length: 4,
    },
  },
  {
    name: 'semantic → null (requires Optic)',
    input: {
      type: 'semantic',
      option: {
        predicate: 'lux:agentClassifiedAs',
        indexReference: 'conceptName',
        order: 'ascending',
      },
    },
    expected: {
      nonNull: false,
    },
  },
];

for (const scenario of scenarios) {
  const result = buildCtsSearchOptions(scenario.input);
  const e = scenario.expected;
  const prefix = `buildCtsSearchOptions '${scenario.name}'`;

  if (e.nonNull) {
    assertions.push(
      testHelperProxy.assertTrue(
        result != null,
        `${prefix}: should return non-null`,
      ),
    );

    if (result != null) {
      if (e.length !== undefined) {
        assertions.push(
          testHelperProxy.assertEqual(
            e.length,
            result.length,
            `${prefix}: expected ${e.length} options, got ${result.length}`,
          ),
        );
      }

      // Serialize options for string matching (cts objects need xdmp.quote).
      const serialized = result.map((o) =>
        typeof o === 'string' ? o : xdmp.quote(o),
      );
      const joined = serialized.join(' ');

      if (e.contains) {
        for (const text of e.contains) {
          assertions.push(
            testHelperProxy.assertTrue(
              joined.includes(text),
              `${prefix}: options should contain '${text}'. Got: ${joined}`,
            ),
          );
        }
      }

      if (e.excludes) {
        for (const text of e.excludes) {
          assertions.push(
            testHelperProxy.assertFalse(
              joined.includes(text),
              `${prefix}: options should NOT contain '${text}'. Got: ${joined}`,
            ),
          );
        }
      }
    }
  } else {
    assertions.push(
      testHelperProxy.assertTrue(
        result == null,
        `${prefix}: should return null`,
      ),
    );
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
