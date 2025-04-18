import { testHelperProxy } from '/test/test-helper.mjs';
import { executeErrorSupportedScenario } from '/test/unitTestUtils.mjs';
import { throwIfCurrentUserIsServiceAccount } from '/lib/securityLib.mjs';
import {
  USERNAME_FOR_REGULAR_USER,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/test/unitTestConstants.mjs';

const LIB = '0400 throwIfCurrentUserIsServiceAccount.mjs';
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
    throwIfCurrentUserIsServiceAccount,
    {
      userId: xdmp.user(scenario.input.username),
    }
  );

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
