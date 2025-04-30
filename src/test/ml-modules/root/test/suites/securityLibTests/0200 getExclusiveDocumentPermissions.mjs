import { testHelperProxy } from '/test/test-helper.mjs';
import { executeErrorSupportedScenario } from '/test/unitTestUtils.mjs';
import { User } from '/lib/User.mjs';
import {
  CAPABILITY_READ,
  CAPABILITY_UPDATE,
  getExclusiveDocumentPermissions,
  getExclusiveRoleNameByUsername,
} from '/lib/securityLib.mjs';
import {
  USERNAME_FOR_REGULAR_USER,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/test/unitTestConstants.mjs';

const LIB = '0200 getExclusiveDocumentPermissions.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Regular user',
    input: {
      username: USERNAME_FOR_REGULAR_USER,
    },
    expected: {
      error: false,
      value: [
        // Will fail if "0100 handleRequest.mjs" doesn't run first.
        xdmp.permission(
          getExclusiveRoleNameByUsername(
            USERNAME_FOR_REGULAR_USER,
            CAPABILITY_READ
          ),
          'read'
        ),
        xdmp.permission(
          getExclusiveRoleNameByUsername(
            USERNAME_FOR_REGULAR_USER,
            CAPABILITY_UPDATE
          ),
          'update'
        ),
      ],
    },
  },
  {
    name: 'Service account',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
    },
    expected: {
      error: true,
      stackToInclude: 'Service accounts may not perform this operation',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return getExclusiveDocumentPermissions(new User());
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
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
