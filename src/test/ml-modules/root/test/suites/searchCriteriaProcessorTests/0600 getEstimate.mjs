import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { SearchPatternOptions } from '/lib/SearchPatternOptions.mjs';
import { ML_APP_NAME } from '/lib/appConstants.mjs';

const LIB = '0600 getEstimateTests.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'agent name search',
    input: {
      searchCriteria: { _scope: 'agent', name: 'Pablo' },
    },
    expected: {
      error: false,
      value: 16,
    },
  },
  {
    name: 'item text search',
    input: {
      searchCriteria: { _scope: 'item', text: 'blue' },
    },
    expected: {
      error: false,
      value: 4868,
    },
  },
  {
    name: 'item AND text search',
    input: {
      searchCriteria: {
        _scope: 'item',
        AND: [{ text: 'lobster' }],
      },
    },
    expected: {
      error: false,
      value: 42,
    },
  },
  {
    name: 'item OR with nested AND, name, and producedBy',
    input: {
      searchCriteria: {
        _scope: 'item',
        OR: [
          {
            AND: [
              { depth: '100', _comp: '>=' },
              { width: '100', _comp: '>=' },
            ],
          },
          { name: 'box' },
          { producedBy: { name: 'john' } },
        ],
      },
    },
    expected: {
      error: false,
      value: 761,
    },
  },
  {
    name: 'item AND with nested AND and producedBy',
    input: {
      searchCriteria: {
        _scope: 'item',
        AND: [
          {
            AND: [
              { depth: '100', _comp: '>=' },
              { width: '100', _comp: '>=' },
            ],
          },
          { producedBy: { name: 'john' } },
        ],
      },
    },
    expected: {
      error: false,
      value: 3,
    },
  },
  {
    name: 'item AND with nested OR and name',
    input: {
      searchCriteria: {
        _scope: 'item',
        AND: [
          {
            OR: [
              { depth: '100', _comp: '>=' },
              { width: '100', _comp: '>=' },
            ],
          },
          { name: 'box' },
        ],
      },
    },
    expected: {
      error: false,
      value: 10,
    },
  },
  {
    name: 'item AND with nested OR and NOT',
    input: {
      searchCriteria: {
        _scope: 'item',
        AND: [
          {
            OR: [
              { depth: '100', _comp: '>=' },
              { width: '100', _comp: '>=' },
            ],
          },
          { name: 'box' },
          {
            NOT: [{ name: 'giraffe' }, { recordType: 'DigitalObject' }],
          },
        ],
      },
    },
    expected: {
      error: false,
      value: 10,
    },
  },
  {
    name: 'item OR with ranges, name, and text',
    input: {
      searchCriteria: {
        _scope: 'item',
        OR: [
          { height: '100', _comp: '>=' },
          { width: '100', _comp: '>=' },
          { name: 'tool' },
          { text: 'gate' },
        ],
      },
    },
    expected: {
      error: false,
      value: 9754,
    },
  },
  {
    name: 'item OR with single producedBy hop',
    input: {
      searchCriteria: {
        _scope: 'item',
        OR: [{ producedBy: { name: 'john' } }],
      },
    },
    expected: {
      error: false,
      value: 10170,
    },
  },
];

// Test getEstimate scenarios
const failures = [];

const invokeFunOptions = {
  database: xdmp.database(`${ML_APP_NAME}-content`),
};
for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const processor = new SearchCriteriaProcessor(true, true, true);

    processor.process(
      scenario.input.searchCriteria,
      null, // scopeName from criteria
      false, // allowMultiScope
      new SearchPatternOptions(),
      true, // includeTypeConstraint
      1, // page
      20, // pageLength
      null, // pageWith
      null, // sortCriteria
      false, // valuesOnly
    );

    return processor.getEstimate();
  };

  const scenarioResults = executeScenario(
    scenario,
    zeroArityFun,
    invokeFunOptions,
  );

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const estimate = scenarioResults.actualValue;

    if (
      scenario.expected.value !== undefined &&
      estimate !== scenario.expected.value
    ) {
      failures.push({
        name: scenario.name,
        expected: scenario.expected.value,
        actual: estimate,
      });
    }
  } else if (scenarioResults.assertions.length > 0) {
    // Error was expected but something went wrong
    failures.push({
      name: scenario.name,
      expected: scenario.expected.value,
      actual: `ERROR: ${scenarioResults.assertions.map((a) => a.toString()).join('; ')}`,
    });
  }
}

if (failures.length > 0) {
  const details = failures
    .map((f) => `  '${f.name}': expected ${f.expected}, got ${f.actual}`)
    .join('\n');
  assertions.push(
    testHelperProxy.assertTrue(
      false,
      `${failures.length} of ${scenarios.length} scenario(s) failed:\n${details}`,
    ),
  );
} else {
  scenarios.forEach((scenario) => {
    assertions.push(testHelperProxy.success());
  });
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
