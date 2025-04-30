import { testHelperProxy } from '/test/test-helper.mjs';
import { executeErrorSupportedScenario } from '/test/unitTestUtils.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import {
  CAPABILITY_READ,
  CAPABILITY_UPDATE,
  UNIT_NAME_UNRESTRICTED,
  handleRequestV2ForUnitTesting,
  getEndpointAccessUnitNames,
  getExclusiveRoleNameByUsername,
} from '/lib/securityLib.mjs';
import {
  FOO_URI,
  USERNAME_FOR_REGULAR_USER,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/test/unitTestConstants.mjs';

const LIB = '0100 handleRequest.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

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

const regularUserRoleNames = [
  getExclusiveRoleNameByUsername(USERNAME_FOR_REGULAR_USER, CAPABILITY_READ),
  getExclusiveRoleNameByUsername(USERNAME_FOR_REGULAR_USER, CAPABILITY_UPDATE),
];

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
    expected: {
      error: false,
      value: returnBar(),
      roleNames: regularUserRoleNames,
    },
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
    expected: {
      error: false,
      value: returnBar(),
      roleNames: regularUserRoleNames,
    },
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
    expected: {
      error: false,
      value: returnBar(),
      roleNames: regularUserRoleNames,
    },
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
    expected: { error: false, value: true, roleNames: regularUserRoleNames },
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
    expected: { error: false, value: true, roleNames: regularUserRoleNames },
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
    expected: { error: false, value: false, roleNames: regularUserRoleNames },
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
    expected: { error: false, value: true, roleNames: regularUserRoleNames },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return handleRequestV2ForUnitTesting(
      scenario.input.function,
      scenario.input.unitName,
      new EndpointConfig(scenario.input.endpointConfig)
    );
  };

  const scenarioResults = executeErrorSupportedScenario(
    scenario,
    zeroArityFun,
    {
      userId: xdmp.user(scenario.input.username),
    }
  );

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.value,
        scenarioResults.actualValue,
        `Scenario '${scenario.name}' did not return the expected value.`
      )
    );
    // Need to run in its own transaction as the call to handleRequest could have created the roles.
    // Not really necessary for scenarios that share the same user but :shrug:
    const fun = () => {
      return scenario.expected.roleNames.map((roleName) => {
        try {
          xdmp.role(roleName);
          return testHelperProxy.assertTrue(true);
        } catch (e) {
          return testHelperProxy.assertTrue(
            false,
            `Scenario '${scenario.name}' expected role ${roleName} to exist but it didn't.`
          );
        }
      });
    };
    assertions = assertions.concat(xdmp.invokeFunction(fun));
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
