import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';

const LIB = '0100 EndpointConfig.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Allowed in read only mode; not part of My Collections',
    input: {
      ampAsAdmin: false,
      allowInReadOnlyMode: true,
      features: { myCollections: false },
    },
    expected: {
      error: false,
      readOnly: true,
      myCollections: false,
      ampAsAdmin: false,
    },
  },
  {
    name: 'Not allowed in read only mode; part of My Collections',
    input: {
      ampAsAdmin: false,
      allowInReadOnlyMode: false,
      features: { myCollections: true },
    },
    expected: {
      error: false,
      readOnly: false,
      myCollections: true,
      ampAsAdmin: false,
    },
  },
  {
    name: 'Allowed in read only mode; part of My Collections; amp as admin',
    input: {
      ampAsAdmin: true,
      allowInReadOnlyMode: true,
      features: { myCollections: true },
    },
    expected: {
      error: false,
      readOnly: true,
      myCollections: true,
      ampAsAdmin: true,
    },
  },
  {
    name: 'Missing the allowInReadOnlyMode property',
    input: {
      ampAsAdmin: false,
      features: { myCollections: true },
    },
    expected: {
      error: true,
      stackToInclude:
        "is missing the 'allowInReadOnlyMode' configuration property",
    },
  },
  {
    name: 'Invalid allowInReadOnlyMode property value',
    input: {
      ampAsAdmin: false,
      allowInReadOnlyMode: 'I should be a boolean',
      features: { myCollections: true },
    },
    expected: {
      error: true,
      stackToInclude:
        "the 'allowInReadOnlyMode' property value is not one of the allowed values",
    },
  },
  {
    name: 'Missing the features property',
    input: {
      ampAsAdmin: false,
      allowInReadOnlyMode: false,
    },
    expected: {
      error: true,
      stackToInclude: "is missing the 'features' configuration property",
    },
  },
  {
    name: 'Invalid features property value',
    input: {
      ampAsAdmin: false,
      allowInReadOnlyMode: false,
      features: 'I should be an object',
    },
    expected: {
      error: true,
      stackToInclude: "the 'features' property value has the wrong value type",
    },
  },
  {
    name: 'Missing the myCollections property',
    input: {
      ampAsAdmin: false,
      allowInReadOnlyMode: false,
      features: {},
    },
    expected: {
      error: true,
      stackToInclude: "is missing the 'myCollections' configuration property",
    },
  },
  {
    name: 'Invalid myCollections property value',
    input: {
      ampAsAdmin: false,
      allowInReadOnlyMode: false,
      features: { myCollections: 'I should be a boolean' },
    },
    expected: {
      error: true,
      stackToInclude:
        "the 'myCollections' property value is not one of the allowed values",
    },
  },
  {
    name: 'Missing the ampAsAdmin property',
    input: {
      allowInReadOnlyMode: false,
      features: { myCollections: false },
    },
    expected: {
      error: true,
      stackToInclude: "is missing the 'ampAsAdmin' configuration property",
    },
  },
  {
    name: 'Invalid ampAsAdmin property value',
    input: {
      ampAsAdmin: 'I should be a boolean',
      allowInReadOnlyMode: false,
      features: { myCollections: false },
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
        scenario.expected.readOnly,
        endpointConfig.mayExecuteInReadOnlyMode(),
        `Scenario '${scenario.name}' expected ${scenario.expected.readOnly} from mayExecuteInReadOnlyMode but didn't get it.`,
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        !scenario.expected.readOnly,
        endpointConfig.mayNotExecuteInReadOnlyMode(),
        `Scenario '${scenario.name}' expected ${!scenario.expected
          .readOnly} from mayNotExecuteInReadOnlyMode but didn't get it.`,
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.myCollections,
        endpointConfig.isPartOfMyCollectionsFeature(),
        `Scenario '${scenario.name}' expected ${scenario.expected.isPartOfMyCollectionsFeature} from isPartOfMyCollectionsFeature but didn't get it.`,
      ),
    );
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
