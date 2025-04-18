import { testHelperProxy } from '/test/test-helper.mjs';
import { isCurrentUserServiceAccount } from '/lib/securityLib.mjs';
import {
  USERNAME_FOR_REGULAR_USER,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/test/unitTestConstants.mjs';

const LIB = '0300 isCurrentUserServiceAccount.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

let username = USERNAME_FOR_SERVICE_ACCOUNT;
let expectedValue = true;
let actualValue = xdmp.invokeFunction(isCurrentUserServiceAccount, {
  userId: xdmp.user(username),
});
assertions.push(
  testHelperProxy.assertEqual(
    expectedValue,
    actualValue,
    `Expected ${username} to be a service account`
  )
);

username = USERNAME_FOR_REGULAR_USER;
expectedValue = false;
actualValue = xdmp.invokeFunction(isCurrentUserServiceAccount, {
  userId: xdmp.user(username),
});
assertions.push(
  testHelperProxy.assertEqual(
    expectedValue,
    actualValue,
    `Expected ${username} to be a service account`
  )
);

assertions;
