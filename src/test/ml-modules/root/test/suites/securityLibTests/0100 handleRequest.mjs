import { testHelperProxy } from '/test/test-helper.mjs';
import {
  UNRESTRICTED_UNIT_NAME,
  getServiceAccountUsernames,
  handleRequest,
} from '/lib/securityLib.mjs';
import { FEATURE_MY_COLLECTIONS_ENABLED } from '/lib/appConstants.mjs';

const LIB = '0100 handleRequest.mjs';
console.log(`${LIB}: starting.`);

const assertions = [];

const usernameForRegularUser = '%%mlAppName%%-unit-test-regular-user';
const usernameForServiceAccount = getServiceAccountUsernames()[0];

// Some functions used to verify handleRequest returns the value of
// the function it is given.
const funReturn10 = () => {
  return 5 + 5;
};
const funReturnFoo = () => {
  return 'foo';
};

// Verify handleRequest returns the value from the given function.
assertions.push(
  testHelperProxy.assertEqual(
    funReturn10(),
    handleRequest(funReturn10),
    'handleRequest did not return the value of the given function'
  )
);

// Remaining tests require the My Collections feature.
assertions.push(
  testHelperProxy.assertTrue(
    FEATURE_MY_COLLECTIONS_ENABLED,
    `The rest of the '${LIB}' assertions require the My Collections feature to be enabled.`
  )
);

const scenarios = [
  {
    name: 'Non-service account',
    input: {
      username: usernameForRegularUser,
      fun: funReturnFoo,
      unitName: UNRESTRICTED_UNIT_NAME,
    },
    expected: { error: false, value: funReturnFoo() },
  },
  {
    name: 'Service account',
    input: {
      username: usernameForServiceAccount,
      fun: funReturnFoo,
      unitName: null,
    },
    expected: {
      error: true,
      stackToInclude: 'Service accounts are not permitted to use this endpoint',
    },
  },
];

for (const scenario of scenarios) {
  console.log(`Processing scenario '${scenario.name}'`);
  const errorExpected = scenario.expected.error === true;
  // Had to jump through some hoops to get this to work (xdmp.rethrow didn't work)
  let errorExpectedButNotThrown = false;
  try {
    const funWrapper = () => {
      return handleRequest(scenario.input.fun, scenario.input.unitName);
    };
    const actualValue = xdmp.invokeFunction(funWrapper, {
      userId: xdmp.user(scenario.input.username),
    });
    if (errorExpected) {
      errorExpectedButNotThrown = true;
    } else {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.value,
          actualValue,
          `Scenario '${scenario.name}' did not return the expected value.`
        )
      );
    }
  } catch (e) {
    if (!errorExpected) {
      fn.error(
        xs.QName('ASSERT-THROWS-ERROR-FAILED'),
        `Scenario '${scenario.name}' resulted in an error when one was NOT expected; e.message: '${e.message}'`
      );
    }

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
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
