import { testHelperProxy } from '/test/test-helper.mjs';
import { assertPermissionArraysMatch } from '/test/unitTestUtils.mjs';
import { USERNAME_FOR_CLYDE } from '/test/unitTestConstants.mjs';
import { isProduction } from '/lib/environmentLib.mjs';
import {
  CAPABILITY_READ,
  CAPABILITY_UPDATE,
  ROLE_NAME_MY_COLLECTION_DATA_READER,
  ROLE_NAME_MY_COLLECTIONS_FEATURE_DATA_UPDATER,
} from '/lib/securityLib.mjs';
import {
  COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
  COLLECTION_NAME_MY_COLLECTION,
  COLLECTION_NAME_NON_PRODUCTION,
  COLLECTION_NAME_PRODUCTION,
} from '/lib/appConstants.mjs';

const LIB = '0220 myCollection.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Find out Clyde's (likely default) My Collection URI.
const myCollectionDocNode = fn.head(
  xdmp.invokeFunction(
    () => {
      return fn.head(
        cts.search(cts.collectionQuery(COLLECTION_NAME_MY_COLLECTION))
      );
    },
    {
      userId: xdmp.user(USERNAME_FOR_CLYDE),
    }
  )
);
assertions.push(
  testHelperProxy.assertExists(
    myCollectionDocNode,
    `The myCollection tests are dependent on a My Collection already existing for '${USERNAME_FOR_CLYDE}'`
  )
);
const myCollectionUri = fn.baseUri(myCollectionDocNode) + '';

// Check the collections.
const expectedCollections = [
  isProduction() ? COLLECTION_NAME_PRODUCTION : COLLECTION_NAME_NON_PRODUCTION,
  COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
  COLLECTION_NAME_MY_COLLECTION,
];
const actualCollections = fn.head(
  xdmp.invokeFunction(
    () => {
      return xdmp.documentGetCollections(myCollectionUri);
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
    `The My Collection document was expected in the ${expectedCollections.join(
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
  xdmp.permission(
    ROLE_NAME_MY_COLLECTIONS_FEATURE_DATA_UPDATER,
    CAPABILITY_READ
  ),
  xdmp.permission(
    ROLE_NAME_MY_COLLECTIONS_FEATURE_DATA_UPDATER,
    CAPABILITY_UPDATE
  ),
  xdmp.permission(ROLE_NAME_MY_COLLECTION_DATA_READER, CAPABILITY_READ),
];
const actualPermissions = fn.head(
  xdmp.invokeFunction(
    () => {
      return xdmp.documentGetPermissions(myCollectionUri);
    },
    { userId: xdmp.user(USERNAME_FOR_CLYDE) }
  )
);
assertPermissionArraysMatch(
  'my collection',
  assertions,
  expectedPermissions,
  actualPermissions
);

console.log(`${LIB}: completed ${assertions.length} assertions.`);

assertions;
