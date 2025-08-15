import { testHelperProxy } from '/test/test-helper.mjs';
import { isCurrentUserServiceAccount } from '/lib/securityLib.mjs';
import {
  USERNAME_FOR_BONNIE,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/test/unitTestConstants.mjs';

const LIB = '0300 isCurrentUserServiceAccount.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Regular user',
    input: {
      username: USERNAME_FOR_BONNIE,
    },
    expected: {
      value: false,
    },
  },
  {
    name: 'Service account',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
    },
    expected: {
      value: true,
    },
  },
];

for (const scenario of scenarios) {
  const actualResult = xdmp.invokeFunction(isCurrentUserServiceAccount, {
    userId: xdmp.user(scenario.input.username),
  });
  assertions.push(
    testHelperProxy.assertEqual(
      scenario.expected.value,
      actualResult,
      `Scenario '${scenario.name}'`
    )
  );
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
export default assertions;
