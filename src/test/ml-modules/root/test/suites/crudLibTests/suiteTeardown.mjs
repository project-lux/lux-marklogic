import { USERNAME_FOR_REGULAR_USER } from '/test/unitTestConstants.mjs';
import {
  removeCollections,
  removeExclusiveRolesByUsername,
} from '/test/unitTestUtils.mjs';
import {
  COLLECTION_NAME_MY_COLLECTION,
  COLLECTION_NAME_USER_PROFILE,
} from '/lib/appConstants.mjs';

try {
  // Delete collections before the user's roles!
  removeCollections(
    [COLLECTION_NAME_MY_COLLECTION, COLLECTION_NAME_USER_PROFILE],
    USERNAME_FOR_REGULAR_USER
  );
  removeExclusiveRolesByUsername(USERNAME_FOR_REGULAR_USER);

  const zeroArityFun = () => {
    const collectionName = 'userProfile';
    console.log(
      `Checking the '${collectionName}' collection within the ${xdmp.databaseName(
        xdmp.database()
      )} after delete...`
    );
    cts
      .search(cts.collectionQuery(collectionName))
      .toArray()
      .forEach((doc) => {
        console.log(`Found ${doc.baseURI}`);
      });
  };
  xdmp.invokeFunction(zeroArityFun);
} catch (e) {
  console.error(
    `crudLibTests/suiteTeardown.mjs encountered an error: ${e.message}`
  );
  console.dir(e);
}
