import { testHelperProxy } from '/test/test-helper.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import {
  UNIT_NAME_UNRESTRICTED,
  handleRequestV2ForUnitTesting,
  getEndpointAccessUnitNames,
} from '/lib/securityLib.mjs';
import {
  FOO_URI,
  USERNAME_FOR_REGULAR_USER,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/unitTestConstants.mjs';

const LIB = '0100 handleRequest.mjs';
console.log(`${LIB}: starting.`);

const assertions = [];

// Little buddies used in more than one scenario.
const returnBar = () => {
  return 'bar';
};
const canReadDoc = () => {
  return fn.docAvailable(FOO_URI);
};

assertions.push(
  testHelperProxy.assertTrue(
    canReadDoc(),
    `Setup wasn't able to create ${FOO_URI}`
  )
);

const scenarios = [
  {
    name: 'User consuming My Collections endpoint',
    input: {
      username: USERNAME_FOR_REGULAR_USER,
      function: returnBar,
      unitName: UNIT_NAME_UNRESTRICTED,
      endpointConfig: {
        allowInReadOnlyMode: true,
        features: { myCollections: true },
      },
    },
    expected: { error: false, value: returnBar() },
  },
  {
    name: 'Service account consuming My Collections endpoint',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
      function: returnBar,
      unitName: null,
      endpointConfig: {
        allowInReadOnlyMode: true,
        features: { myCollections: true },
      },
    },
    expected: {
      error: true,
      stackToInclude: 'Service accounts are not permitted to use this endpoint',
    },
  },
  {
    name: 'User consuming non-My Collections endpoint',
    input: {
      username: USERNAME_FOR_REGULAR_USER,
      function: returnBar,
      unitName: UNIT_NAME_UNRESTRICTED,
      endpointConfig: {
        allowInReadOnlyMode: true,
        features: { myCollections: false },
      },
    },
    expected: { error: false, value: returnBar() },
  },
  {
    name: 'Service account consuming non-My Collections endpoint',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
      function: returnBar,
      unitName: null,
      endpointConfig: {
        allowInReadOnlyMode: true,
        features: { myCollections: false },
      },
    },
    expected: { error: false, value: returnBar() },
  },
  {
    name: 'User attempting to access a document with default unit',
    input: {
      username: USERNAME_FOR_REGULAR_USER,
      function: canReadDoc,
      unitName: null,
      endpointConfig: {
        allowInReadOnlyMode: true,
        features: { myCollections: false },
      },
    },
    expected: { error: false, value: true },
  },
  {
    name: 'User attempting to access a document with unit',
    input: {
      username: USERNAME_FOR_REGULAR_USER,
      function: canReadDoc,
      unitName: UNIT_NAME_UNRESTRICTED,
      endpointConfig: {
        allowInReadOnlyMode: true,
        features: { myCollections: false },
      },
    },
    expected: { error: false, value: true },
  },
  {
    name: 'User attempting to access a document with unit that does not have access to the doc',
    input: {
      username: USERNAME_FOR_REGULAR_USER,
      function: canReadDoc,
      unitName: getEndpointAccessUnitNames()[0],
      endpointConfig: {
        allowInReadOnlyMode: true,
        features: { myCollections: false },
      },
    },
    expected: { error: false, value: false },
  },
  {
    name: 'Service account attempting to access a document',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
      function: canReadDoc,
      unitName: null,
      endpointConfig: {
        allowInReadOnlyMode: true,
        features: { myCollections: false },
      },
    },
    expected: { error: false, value: true },
  },
];

for (const scenario of scenarios) {
  console.log(`Processing scenario '${scenario.name}'`);
  // Had to jump through some hoops to support the testing function throw exceptions.
  let actualValue;
  const errorExpected = scenario.expected.error === true;
  let errorExpectedButNotThrown = false;
  let applyErrorNotExpectedAssertions = false;
  try {
    const functionWrapper = () => {
      return handleRequestV2ForUnitTesting(
        scenario.input.function,
        scenario.input.unitName,
        new EndpointConfig(scenario.input.endpointConfig)
      );
    };
    actualValue = xdmp.invokeFunction(functionWrapper, {
      userId: xdmp.user(scenario.input.username),
    });
    // Perform all asserts outside this try block.
    if (errorExpected) {
      errorExpectedButNotThrown = true;
    } else {
      applyErrorNotExpectedAssertions = true;
    }
  } catch (e) {
    if (!errorExpected) {
      const msg = `Scenario '${scenario.name}' resulted in an error when one was NOT expected; e.message: '${e.message}'; see log for the stacktrace`;
      console.log(msg);
      console.log(e.stack);
      fn.error(xs.QName('ASSERT-THROWS-ERROR-FAILED'), msg);
    }

    // See if the expected error includes the expected text.
    const msg = `Scenario '${scenario.name}' error stacktrace does not include "${scenario.expected.stackToInclude}"; see log for the stacktrace`;
    const idx = e.stack.indexOf(scenario.expected.stackToInclude);
    if (idx == -1) {
      console.log(msg);
      console.log(e.stack);
    }
    assertions.push(testHelperProxy.assertNotEqual(-1, idx, msg));
  }

  if (errorExpectedButNotThrown) {
    fn.error(
      xs.QName('ASSERT-THROWS-ERROR-FAILED'),
      `Scenario '${scenario.name}' didn't result in an error when one was expected.`
    );
  }

  if (applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.value,
        actualValue,
        `Scenario '${scenario.name}' did not return the expected value.`
      )
    );
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
