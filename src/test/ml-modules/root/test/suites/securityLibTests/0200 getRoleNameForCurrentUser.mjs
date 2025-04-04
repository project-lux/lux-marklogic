import { testHelperProxy } from '/test/test-helper.mjs';
import {
  CAPABILITY_READ,
  CAPABILITY_UPDATE,
  getRoleNameForCurrentUser,
} from '/lib/securityLib.mjs';
import {
  USERNAME_FOR_REGULAR_USER,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/unitTestConstants.mjs';

const LIB = '0200 getRoleNameForCurrentUser.mjs';
console.log(`${LIB}: starting.`);

const assertions = [];

const CAPABILITY_INVALID = 'lock';

const scenarios = [
  {
    name: 'Request from service account',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
      capability: CAPABILITY_READ,
      mayCreate: true,
    },
    expected: {
      error: true,
      stackToInclude: 'Service accounts may not perform this operation',
    },
  },
  {
    name: 'User requests unsupported capability',
    input: {
      username: USERNAME_FOR_REGULAR_USER,
      capability: CAPABILITY_INVALID,
      mayCreate: true,
    },
    expected: {
      error: true,
      stackToInclude: `Individual user roles do not support the '${CAPABILITY_INVALID}' capability`,
    },
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
      return getRoleNameForCurrentUser(
        scenario.input.capability,
        scenario.input.mayCreate
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
