declareUpdate();

import { TENANT_STATUS_URI } from '/lib/environmentLib.mjs';
import { USERNAME_FOR_CLYDE } from '/test/unitTestConstants.mjs';
import {
  removeCollections,
  removeExclusiveRolesByUsername,
} from '/test/unitTestUtils.mjs';
import {
  COLLECTION_NAME_MY_COLLECTION,
  COLLECTION_NAME_USER_PROFILE,
} from '/lib/appConstants.mjs';

try {
  // Delete the tenant status document.
  if (fn.docAvailable(TENANT_STATUS_URI)) {
    console.log(`Deleting '${TENANT_STATUS_URI}'...`);
    xdmp.documentDelete(TENANT_STATUS_URI);
  }

  // Delete collections before the user's roles!
  removeCollections(
    [COLLECTION_NAME_MY_COLLECTION, COLLECTION_NAME_USER_PROFILE],
    USERNAME_FOR_CLYDE
  );
  removeExclusiveRolesByUsername(USERNAME_FOR_CLYDE);
} catch (e) {
  console.error(
    `collectionAndPermissionsTests/suiteTeardown.mjs encountered an error: ${e.message}`
  );
  console.dir(e);
}
