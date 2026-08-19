import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';

const LIB = '0100 EndpointConfig.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'ampAsAdmin true',
    input: {
      ampAsAdmin: true,
    },
    expected: {
      error: false,
      ampAsAdmin: true,
    },
  },
  {
    name: 'ampAsAdmin false',
    input: {
      ampAsAdmin: false,
    },
    expected: {
      error: false,
      ampAsAdmin: false,
    },
  },
  {
    name: 'Missing the ampAsAdmin property',
    input: {},
    expected: {
      error: true,
      stackToInclude: "is missing the 'ampAsAdmin' configuration property",
    },
  },
  {
    name: 'Invalid ampAsAdmin property value',
    input: {
      ampAsAdmin: 'I should be a boolean',
    },
    expected: {
      error: true,
      stackToInclude:
        "the 'ampAsAdmin' property value is not one of the allowed values",
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return new EndpointConfig(scenario.input);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const endpointConfig = scenarioResults.actualValue;
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.ampAsAdmin,
        endpointConfig.mayAmpAsAdmin(),
        `Scenario '${scenario.name}' expected ${scenario.expected.ampAsAdmin} from mayAmpAsAdmin but didn't get it.`,
      ),
    );
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
