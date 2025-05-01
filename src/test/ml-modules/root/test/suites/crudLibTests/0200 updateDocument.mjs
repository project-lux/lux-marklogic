import { testHelperProxy } from '/test/test-helper.mjs';
import {
  ROLE_NAME_TENANT_ENDPOINT_CONSUMER,
  USERNAME_FOR_REGULAR_USER,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/test/unitTestConstants.mjs';
import {
  executeErrorSupportedScenario,
  removeCollections,
} from '/test/unitTestUtils.mjs';
import { createDocument } from '/lib/crudLib.mjs';
import { handleRequestV2ForUnitTesting } from '/lib/securityLib.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import { IDENTIFIERS } from '/lib/identifierConstants.mjs';
import { COLLECTION_NAME_USER_PROFILE } from '/lib/appConstants.mjs';
import { User } from '/lib/User.mjs';

const LIB = '0200 updateDocument.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Our regular user needs to be associated to a unit in advanced of calling handleRequest
// (instantiating an eager instance of User needs it).
xdmp.invokeFunction(
  () => {
    declareUpdate();
    const sec = require('/MarkLogic/security.xqy');
    sec.userAddRoles(
      USERNAME_FOR_REGULAR_USER,
      ROLE_NAME_TENANT_ENDPOINT_CONSUMER
    );
  },
  { database: xdmp.securityDatabase() }
);

const existingUser = fn.head(
  xdmp.invokeFunction(
    () => {
      console.log(`Creating user instance for ${xdmp.getCurrentUser()}`);
      return new User(true); // retrieve user profile as this user.
    },
    { userId: xdmp.user(USERNAME_FOR_REGULAR_USER) }
  )
);
const existingUserProfile = existingUser.getUserProfile();
assertions.push(
  testHelperProxy.assertExists(
    existingUserProfile,
    `The updateDocument tests are dependent on the createDocument tests creating a user profile for '${USERNAME_FOR_REGULAR_USER}'`
  )
);

assertions;
