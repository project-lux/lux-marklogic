/**
 * Test suite for SCP.buildPlans() - Error Handling
 * Tests error conditions that surface during plan building (after prepare succeeds).
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import { PatternOptions } from '/lib/search/PatternOptions.mjs';

const LIB = '0307-buildPlans-errorHandling.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Helper function to create default process parameters
function createProcessInput(overrides = {}) {
  return {
    scopeName: 'agent',
    allowMultiScope: false,
    patternOptions: new PatternOptions(),
    includeTypeConstraint: true,
    page: 1,
    pageLength: 20,
    pageWith: null,
    sortCriteria: null,
    ...overrides,
  };
}

const scenarios = [
  {
    name: 'Search with only ignored terms (stop words)',
    input: {
      searchCriteria: { _scope: 'agent', text: 'a the and' },
      ...createProcessInput(),
    },
    expected: {
      error: true,
      stackToInclude: 'which is an ignored term',
    },
  },
  {
    name: 'Empty search criteria object',
    input: {
      searchCriteria: { _scope: 'agent' },
      ...createProcessInput(),
    },
    expected: {
      error: true,
      stackToInclude: 'search term does not specify a term name in criteria',
    },
  },
  {
    name: 'Search criteria with only whitespace text',
    input: {
      searchCriteria: { _scope: 'agent', text: '   ' },
      ...createProcessInput(),
    },
    expected: {
      error: true,
      stackToInclude: 'the search criteria given only contains',
    },
  },
  {
    name: 'Atomic-only pattern rejects group value',
    input: {
      searchCriteria: {
        _scope: 'agent',
        text: { AND: [{ text: 'Pablo' }, { text: 'artist' }] },
      },
      ...createProcessInput(),
    },
    expected: {
      error: true,
      stackToInclude: "the 'text' term contains a group but is not allowed to",
    },
  },
  {
    name: 'Atomic-only pattern rejects nested term value',
    input: {
      searchCriteria: {
        _scope: 'agent',
        text: { name: 'Pablo' },
      },
      ...createProcessInput(),
    },
    expected: {
      error: true,
      stackToInclude:
        "the 'text' term contains another term but is not allowed to",
    },
  },
  {
    name: 'Group/term-only pattern rejects atomic value',
    input: {
      searchCriteria: {
        _scope: 'agent',
        classification: 'painting',
      },
      ...createProcessInput(),
    },
    expected: {
      error: true,
      stackToInclude:
        "the search term 'classification' in scope 'agent' does not accept atomic values",
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = new SCP();
    const input = scenario.input;

    scp.prepare({ ...input }).buildPlans();

    return {
      processed: true,
    };
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorExpectedAssertions) {
    if (scenario.expected.stackToInclude) {
      assertions.push(
        testHelperProxy.assertTrue(
          scenarioResults.error.stack.includes(
            scenario.expected.stackToInclude,
          ),
          `Scenario '${scenario.name}' should include error message: ${scenario.expected.stackToInclude}. Actual error: ${scenarioResults.error.stack}`,
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
