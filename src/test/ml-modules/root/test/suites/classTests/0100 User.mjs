import { testHelperProxy } from '/test/test-helper.mjs';
import {
  ROLE_NAME_UNIT_TEST_SERVICE_ACCOUNT_READER,
  ROLE_NAME_UNIT_TESTER,
} from '/test/unitTestConstants.mjs';
import { User } from '/lib/User.mjs';

let assertions = [];

let user = new User();
assertions.push(
  testHelperProxy.assertEqual(xdmp.getCurrentUser(), user.getUsername()),
  'User.getUsername() should return the current user'
);
assertions.push(
  testHelperProxy.assertNotExists(
    user.getUserIri(),
    `Unit tester is not expected to have a user IRI yet.`
  )
);
assertions.push(
  testHelperProxy.assertFalse(
    user.hasUserProfile(),
    `Unit tester is not expected to have a user profile yet.`
  )
);
assertions.push(
  testHelperProxy.assertTrue(
    user.hasRole(ROLE_NAME_UNIT_TESTER),
    `Unit tester is expected to have the ${ROLE_NAME_UNIT_TESTER} role`
  )
);
assertions.push(
  testHelperProxy.assertFalse(
    user.hasRole(ROLE_NAME_UNIT_TEST_SERVICE_ACCOUNT_READER),
    `Unit tester is not expected to have the ${ROLE_NAME_UNIT_TEST_SERVICE_ACCOUNT_READER} role`
  )
);

user = new User('admin');
assertions.push(
  testHelperProxy.assertEqual(xdmp.getCurrentUser(), user.getUsername()),
  "User's constructor should not apply the username passed in"
);

assertions;
