import { testHelperProxy } from '/test/test-helper.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';

const LIB = '0100 EndpointConfig.mjs';
console.log(`${LIB}: starting.`);

const assertions = [];

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
      messageToInclude:
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
      messageToInclude:
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
      messageToInclude: "is missing the 'features' configuration property",
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
      messageToInclude:
        "the 'features' property value has the wrong value type",
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
      messageToInclude: "is missing the 'myCollections' configuration property",
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
      messageToInclude:
        "the 'myCollections' property value is not one of the allowed values",
    },
  },
];

for (const scenario of scenarios) {
  console.log(`Processing scenario '${scenario.name}'`);
  const errorExpected = scenario.expected.error === true;
  // Had to jump through some hoops to get this to work (xdmp.rethrow didn't work)
  let errorExpectedButNotThrown = false;
  try {
    const endpointConfig = new EndpointConfig(scenario.input);
    if (errorExpected) {
      errorExpectedButNotThrown = true;
    } else {
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
  } catch (e) {
    if (!errorExpected) {
      fn.error(
        xs.QName('ASSERT-THROWS-ERROR-FAILED'),
        `Scenario '${scenario.name}' resulted in an error when one was NOT expected.`
      );
    }
    // Unable to also check the error code (e.g., InternalConfigurationError)
    assertions.push(
      testHelperProxy.assertNotEqual(
        -1,
        e.message.indexOf(scenario.expected.messageToInclude),
        `Scenario '${scenario.name}' error message reads "${e.message}" but should have included "${scenario.expected.messageToInclude}"`
      )
    );
  }

  if (errorExpectedButNotThrown) {
    fn.error(
      xs.QName('ASSERT-THROWS-ERROR-FAILED'),
      `Scenario '${scenario.name}' didn't result in an error when one was expected.`
    );
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
