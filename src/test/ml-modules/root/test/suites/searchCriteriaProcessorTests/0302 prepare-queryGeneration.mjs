/**
 * Test suite for SCP.prepare() + buildPlans() - Query Generation
 * Tests that plan source contains expected fields, values, and CTS constructs.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0302 prepare-queryGeneration.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Simple text search produces plan with agent scope fields',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', text: '"Pablo Picasso"' },
    },
    expected: {
      error: false,
      planContains: ['agentAnyText', 'Pablo Picasso'],
    },
  },
  {
    name: 'Work scope uses correct fields',
    input: {
      scopeName: 'work',
      searchCriteria: { _scope: 'work', text: '"Mona Lisa"' },
    },
    expected: {
      error: false,
      planContains: ['workAnyText', 'Mona Lisa'],
    },
  },
  {
    name: 'Grammar parsing - string input with AND operator',
    input: {
      scopeName: 'agent',
      searchCriteria: 'artist AND painter',
    },
    expected: {
      error: false,
      planContains: ['cts.andQuery', 'artist', 'painter'],
    },
  },
  {
    name: 'Grammar parsing - string input with OR operator',
    input: {
      scopeName: 'agent',
      searchCriteria: 'Pablo OR Vincent',
    },
    expected: {
      error: false,
      planContains: ['Pablo', 'Vincent'],
    },
  },
  {
    name: 'Grammar parsing - quoted phrases',
    input: {
      scopeName: 'agent',
      searchCriteria: '"Pablo Picasso" AND artist',
    },
    expected: {
      error: false,
      planContains: ['cts.andQuery', 'Pablo Picasso', 'artist'],
    },
  },
  {
    name: 'Complex nested JSON criteria generates plan',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        _scope: 'agent',
        AND: [
          { OR: [{ text: 'Pablo' }, { text: 'Vincent' }] },
          { text: 'artist' },
        ],
      },
    },
    expected: {
      error: false,
      planContains: ['Pablo', 'Vincent', 'artist'],
    },
  },
  {
    name: 'Plan includes scope type constraint for agent',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', text: 'Pablo' },
    },
    expected: {
      error: false,
      planContains: ['Person', 'Group'],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = new SCP();
    scp.prepare({
      searchCriteria: scenario.input.searchCriteria,
      scopeName: scenario.input.scopeName,
    });
    const { sortedResultsPlan } = scp.buildPlans();
    return op.toSource(sortedResultsPlan.export());
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const planSource = scenarioResults.actualValue;

    if (scenario.expected.planContains) {
      scenario.expected.planContains.forEach((expectedText) => {
        assertions.push(
          testHelperProxy.assertTrue(
            typeof planSource === 'string' && planSource.includes(expectedText),
            `Scenario '${scenario.name}' - plan should contain '${expectedText}'. Actual plan: ${planSource}`,
          ),
        );
      });
    }

    if (scenario.expected.planExcludes) {
      scenario.expected.planExcludes.forEach((excludedText) => {
        assertions.push(
          testHelperProxy.assertFalse(
            typeof planSource === 'string' && planSource.includes(excludedText),
            `Scenario '${scenario.name}' - plan should NOT contain '${excludedText}'. Actual plan: ${planSource}`,
          ),
        );
      });
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
