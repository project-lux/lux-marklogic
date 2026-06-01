/**
 * Test suite for extractSimpleTextTerms helper in keywordPageSlice.mjs.
 *
 * Covers the V1-eligible criteria shapes: { text: 'foo' }, { text: ['foo', 'bar'] },
 * and AND-of-text. Anything else must return null so the engine falls through
 * to the standard Optic path.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { extractSimpleTextTerms } from '/lib/search/keywordPageSlice.mjs';

const LIB = '0100-extractSimpleTextTerms.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Single text string returns single-element array',
    input: { criteria: { text: 'woman' } },
    expected: { error: false, value: ['woman'] },
  },
  {
    name: 'Text array of strings returned as-is',
    input: { criteria: { text: ['woman', 'greek'] } },
    expected: { error: false, value: ['woman', 'greek'] },
  },
  {
    name: 'AND of text criteria flattens to array',
    input: {
      criteria: {
        AND: [{ text: 'woman' }, { text: 'greek' }, { text: 'art' }],
      },
    },
    expected: { error: false, value: ['woman', 'greek', 'art'] },
  },
  {
    name: 'AND of text criteria with array values flattens',
    input: {
      criteria: { AND: [{ text: ['woman', 'greek'] }, { text: 'art' }] },
    },
    expected: { error: false, value: ['woman', 'greek', 'art'] },
  },
  {
    name: 'Null criteria returns null',
    input: { criteria: null },
    expected: { error: false, value: null },
  },
  {
    name: 'Non-object criteria returns null',
    input: { criteria: 'woman' },
    expected: { error: false, value: null },
  },
  {
    name: 'Multiple top-level keys returns null',
    input: { criteria: { text: 'woman', AND: [{ text: 'greek' }] } },
    expected: { error: false, value: null },
  },
  {
    name: 'OR criteria returns null (not V1 eligible)',
    input: { criteria: { OR: [{ text: 'woman' }, { text: 'greek' }] } },
    expected: { error: false, value: null },
  },
  {
    name: 'AND containing non-text child returns null',
    input: {
      criteria: { AND: [{ text: 'woman' }, { memberOf: 'someUri' }] },
    },
    expected: { error: false, value: null },
  },
  {
    name: 'AND with nested AND returns null (no nesting in V1)',
    input: {
      criteria: {
        AND: [{ text: 'woman' }, { AND: [{ text: 'greek' }] }],
      },
    },
    expected: { error: false, value: null },
  },
  {
    name: 'Empty AND array returns null',
    input: { criteria: { AND: [] } },
    expected: { error: false, value: null },
  },
  {
    name: 'Text with non-string value returns null',
    input: { criteria: { text: 42 } },
    expected: { error: false, value: null },
  },
  {
    name: 'Text array with non-string element returns null',
    input: { criteria: { text: ['woman', 42] } },
    expected: { error: false, value: null },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return extractSimpleTextTerms(scenario.input.criteria);
  };
  const scenarioResults = executeScenario(scenario, zeroArityFun);
  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.value,
        scenarioResults.actualValue,
        `Scenario '${scenario.name}' did not return the expected value.`,
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
