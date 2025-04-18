import { testHelperProxy } from '/test/test-helper.mjs';
import { executeErrorSupportedScenario } from '/test/unitTestUtils.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';

const LIB = '0100 EndpointConfig.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Allowed in read only mode; not part of My Collections',
    input: {
      allowInReadOnlyMode: true,
      features: { myCollections: false },
    },
    expected: { error: false, readOnly: true, myCollections: false },
  },
  {
    name: 'Not allowed in read only mode; part of My Collections',
    input: {
      allowInReadOnlyMode: false,
      features: { myCollections: true },
    },
    expected: { error: false, readOnly: false, myCollections: true },
  },
  {
    name: 'Missing the allowInReadOnlyMode property',
    input: {
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
      allowInReadOnlyMode: false,
      features: { myCollections: 'I should be a boolean' },
    },
    expected: {
      error: true,
      stackToInclude:
        "the 'myCollections' property value is not one of the allowed values",
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return new EndpointConfig(scenario.input);
  };

  const scenarioResults = executeErrorSupportedScenario(scenario, zeroArityFun);

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const endpointConfig = scenarioResults.actualValue;
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.readOnly,
        endpointConfig.mayExecuteInReadOnlyMode(),
        `Scenario '${scenario.name}' expected ${scenario.expected.readOnly} from mayExecuteInReadOnlyMode but didn't get it.`
      )
    );
    assertions.push(
      testHelperProxy.assertEqual(
        !scenario.expected.readOnly,
        endpointConfig.mayNotExecuteInReadOnlyMode(),
        `Scenario '${scenario.name}' expected ${!scenario.expected
          .readOnly} from mayNotExecuteInReadOnlyMode but didn't get it.`
      )
    );
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.myCollections,
        endpointConfig.isPartOfMyCollectionsFeature(),
        `Scenario '${scenario.name}' expected ${scenario.expected.isPartOfMyCollectionsFeature} from isPartOfMyCollectionsFeature but didn't get it.`
      )
    );
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
