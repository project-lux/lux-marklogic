import { testHelperProxy } from '/test/test-helper.mjs';
import { isServiceAccount } from '/lib/securityLib.mjs';
import {
  USERNAME_FOR_REGULAR_USER,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/unitTestConstants.mjs';

const LIB = '0200 isServiceAccount.mjs';
console.log(`${LIB}: starting.`);

const assertions = [];

const scenarios = [
  {
    name: 'Regular user',
    input: {
      username: USERNAME_FOR_REGULAR_USER,
    },
    expected: { value: false },
  },
  {
    name: 'Service account',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
    },
    expected: { value: true },
  },
];

for (const scenario of scenarios) {
  console.log(`Processing scenario '${scenario.name}'`);
  const actualValue = isServiceAccount(scenario.input.username);
  assertions.push(
    testHelperProxy.assertEqual(
      scenario.expected.value,
      actualValue,
      `Scenario '${scenario.name}' did not return the expected value.`
    )
  );
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
