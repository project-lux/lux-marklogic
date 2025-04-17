import { testHelperProxy } from '/test/test-helper.mjs';
import { executeErrorSupportedScenario } from '/test/unitTestUtils.mjs';
import { getExclusiveDocumentPermissionsForCurrentUser } from '/lib/securityLib.mjs';
import {
  USERNAME_FOR_REGULAR_USER,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/test/unitTestConstants.mjs';

const LIB = '0200 getExclusiveDocumentPermissionsForCurrentUser.mjs';
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
        // Indirectly, "0100 handleRequest.mjs" ensures these roles exist.
        xdmp.permission(`${USERNAME_FOR_REGULAR_USER}-reader`, 'read'),
        xdmp.permission(`${USERNAME_FOR_REGULAR_USER}-updater`, 'update'),
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
  const scenarioResults = executeErrorSupportedScenario(
    scenario,
    getExclusiveDocumentPermissionsForCurrentUser,
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
