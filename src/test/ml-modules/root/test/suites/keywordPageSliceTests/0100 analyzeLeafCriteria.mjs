/**
 * Test suite for analyzeLeafCriteria in engine.mjs.
 *
 * Verifies that criteria are parsed into validated SearchTerm objects using
 * the same machinery as buildCriteriaAccumulator (buildLeafSearchTerm,
 * tokenizeTermValue, stop-word filtering) without building an Optic plan.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { analyzeLeafCriteria } from '/lib/search/engine.mjs';

const LIB = '0100-analyzeLeafCriteria.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

function makeStubScp(criteria) {
  const ignoredTerms = [];
  let criteriaCount = 0;
  return {
    getSearchCriteria: () => criteria,
    getSearchScope: () => 'item',
    addIgnoredTerm: (term) => ignoredTerms.push(term),
    getIgnoredTerms: () => ignoredTerms,
    incrementCriteriaCount: () => criteriaCount++,
    getCriteriaCount: () => criteriaCount,
  };
}

const scenarios = [
  {
    name: 'Single text string returns single-element array',
    input: { criteria: { text: 'woman' } },
    expected: { error: false, value: ['woman'] },
  },
  {
    name: 'Multi-word text is tokenized into separate terms',
    input: { criteria: { text: 'woman greek art' } },
    expected: { error: false, value: ['woman', 'greek', 'art'] },
  },
  {
    name: 'Quoted phrase is preserved as single term',
    input: { criteria: { text: 'woman "greek art"' } },
    expected: { error: false, value: ['woman', 'greek art'] },
  },
  {
    name: 'AND of text criteria produces individual terms',
    input: {
      criteria: {
        AND: [{ text: 'woman' }, { text: 'greek' }, { text: 'art' }],
      },
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
    name: 'OR criteria returns null',
    input: { criteria: { OR: [{ text: 'woman' }, { text: 'greek' }] } },
    expected: { error: false, value: null },
  },
  {
    name: 'AND with nested conjunction returns flattened terms',
    input: {
      criteria: {
        AND: [{ text: 'woman' }, { AND: [{ text: 'greek' }] }],
      },
    },
    expected: { error: false, value: ['woman', 'greek'] },
  },
  {
    name: 'Empty AND returns null',
    input: { criteria: { AND: [] } },
    expected: { error: false, value: null },
  },
  {
    name: 'Stop-word-only criteria returns null',
    input: { criteria: { text: 'the' } },
    expected: { error: false, value: null },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = makeStubScp(scenario.input.criteria);
    const result = analyzeLeafCriteria(scp);
    if (!result) return null;
    return result.terms.map((t) => String(t.getValue()));
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
