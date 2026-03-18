import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { SearchPatternOptions } from '/lib/SearchPatternOptions.mjs';

const LIB = '0700 getEstimateTests.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'getEstimate returns valid number',
    input: {
      searchCriteria: { _scope: 'agent', name: 'Pablo' },
    },
    expected: {
      error: false,
      isNumber: true,
      minimumValue: 0,
    },
  },
];

// Test getEstimate scenarios
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

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const estimate = scenarioResults.actualValue;

    if (scenario.expected.isNumber) {
      assertions.push(
        testHelperProxy.assertTrue(
          typeof estimate === 'number',
          `Scenario '${scenario.name}' should return a number.`,
        ),
      );
    }

    if (scenario.expected.minimumValue !== undefined) {
      assertions.push(
        testHelperProxy.assertTrue(
          estimate >= scenario.expected.minimumValue,
          `Scenario '${scenario.name}' should return value >= ${scenario.expected.minimumValue}.`,
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
