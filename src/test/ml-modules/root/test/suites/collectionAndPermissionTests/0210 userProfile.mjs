import { testHelperProxy } from '/test/test-helper.mjs';
import { assertPermissionArraysMatch } from '/test/unitTestUtils.mjs';
import { USERNAME_FOR_CLYDE } from '/test/unitTestConstants.mjs';
import { isProduction } from '/lib/environmentLib.mjs';
import {
  CAPABILITY_READ,
  CAPABILITY_UPDATE,
  ROLE_NAME_MY_COLLECTIONS_DATA_UPDATER,
  ROLE_NAME_USER_PROFILE_DATA_READER,
} from '/lib/securityLib.mjs';
import {
  COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
  COLLECTION_NAME_NON_PRODUCTION,
  COLLECTION_NAME_PRODUCTION,
  COLLECTION_NAME_USER_PROFILE,
} from '/lib/appConstants.mjs';

const LIB = '0210 userProfile.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Find out Clyde's user profile URI.
const userProfileDocNode = fn.head(
  xdmp.invokeFunction(
    () => {
      return fn.head(
        cts.search(cts.collectionQuery(COLLECTION_NAME_USER_PROFILE))
      );
    },
    {
      userId: xdmp.user(USERNAME_FOR_CLYDE),
    }
  )
);
assertions.push(
  testHelperProxy.assertExists(
    userProfileDocNode,
    `The userProfile tests are dependent on a user profile already existing for '${USERNAME_FOR_CLYDE}'`
  )
);
const userProfileUri = fn.baseUri(userProfileDocNode) + '';

// Check the collections.
const expectedCollections = [
  isProduction() ? COLLECTION_NAME_PRODUCTION : COLLECTION_NAME_NON_PRODUCTION,
  COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
  COLLECTION_NAME_USER_PROFILE,
];
const actualCollections = fn.head(
  xdmp.invokeFunction(
    () => {
      return xdmp.documentGetCollections(userProfileUri);
    },
    {
      userId: xdmp.user(USERNAME_FOR_CLYDE),
    }
  )
);
assertions.push(
  testHelperProxy.assertEqual(
    expectedCollections,
    actualCollections,
    `The user profile document was expected in the ${expectedCollections.join(
      ', '
    )} collections, but was found in ${actualCollections.join(', ')}`
  )
);

// Check the permissions.
const userExclusiveRoleName = `${USERNAME_FOR_CLYDE}-updater`;
const expectedPermissions = [
  // First two from getExclusiveDocumentPermissions
  xdmp.permission(userExclusiveRoleName, CAPABILITY_READ),
  xdmp.permission(userExclusiveRoleName, CAPABILITY_UPDATE),
  xdmp.permission(ROLE_NAME_MY_COLLECTIONS_DATA_UPDATER, CAPABILITY_READ),
  xdmp.permission(ROLE_NAME_MY_COLLECTIONS_DATA_UPDATER, CAPABILITY_UPDATE),
  xdmp.permission(ROLE_NAME_USER_PROFILE_DATA_READER, CAPABILITY_READ),
];
const actualPermissions = fn.head(
  xdmp.invokeFunction(
    () => {
      return xdmp.documentGetPermissions(userProfileUri);
    },
    { userId: xdmp.user(USERNAME_FOR_CLYDE) }
  )
);
assertPermissionArraysMatch(
  'user profile',
  assertions,
  expectedPermissions,
  actualPermissions
);

console.log(`${LIB}: completed ${assertions.length} assertions.`);

assertions;
