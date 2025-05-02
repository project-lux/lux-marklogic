//declareUpdate();

import {
  HMO_URI,
  USERNAME_FOR_REGULAR_USER,
} from '/test/unitTestConstants.mjs';
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

  // Delete our sample doc.
  // Using invoke as this module is not otherwise happy declaring the update.
  if (fn.docAvailable(HMO_URI)) {
    xdmp.invokeFunction(() => {
      declareUpdate();
      console.log(`Deleting '${HMO_URI}'...`);
      xdmp.documentDelete(HMO_URI);
    });
  }
} catch (e) {
  console.error(
    `crudLibTests/suiteTeardown.mjs encountered an error: ${e.message}`
  );
  console.dir(e);
}
