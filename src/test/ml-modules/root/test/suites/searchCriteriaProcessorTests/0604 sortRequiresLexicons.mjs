/**
 * Test suite for sortRequiresLexicons (from engine.mjs).
 * Pure function: returns true when the sort requires lexicon columns
 * (random, non-semantic field, or semantic), false otherwise.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { sortRequiresLexicons } from '/lib/search/engine.mjs';
import { SortCriteria } from '/lib/SortCriteria.mjs';

const LIB = '0604 sortRequiresLexicons.mjs';
console.log(`${LIB}: starting.`);

const scenarios = [
  // --- False cases ---
  {
    name: 'null sortCriteria returns false',
    input: null,
    expected: false,
  },
  {
    name: 'undefined sortCriteria returns false',
    input: undefined,
    expected: false,
  },
  {
    name: 'default relevance sort returns false',
    input: new SortCriteria('agent', ''),
    expected: false,
  },
  {
    name: 'explicit relevance sort returns false',
    input: new SortCriteria('agent', 'relevance'),
    expected: false,
  },
  {
    name: 'non-semantic sort returns false',
    input: new SortCriteria('agent', 'agentStartDate'),
    expected: false,
  },

  // --- True cases ---
  {
    name: 'random sort returns true',
    input: new SortCriteria('agent', 'random'),
    expected: true,
  },
  {
    name: 'semantic sort returns true',
    input: new SortCriteria('agent', 'agentClassificationConceptName'),
    expected: true,
  },

  // --- Precedence edge cases ---
  {
    name: 'random after non-semantic — random wins, returns true',
    input: new SortCriteria('agent', 'agentActiveDate,random'),
    expected: true,
  },
  {
    name: 'semantic after non-semantic — semantic wins, returns true',
    input: new SortCriteria(
      'agent',
      'agentActiveDate,agentClassificationConceptName',
    ),
    expected: true,
  },
];

const assertions = [];

for (const scenario of scenarios) {
  const actual = sortRequiresLexicons(scenario.input);
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
