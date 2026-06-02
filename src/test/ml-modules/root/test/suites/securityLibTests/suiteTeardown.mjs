import { FOO_URI, USERNAME_FOR_BONNIE } from '/test/unitTestConstants.mjs';
import {
  removeCollections,
  removeExclusiveRolesByUsername,
} from '/test/unitTestUtils.mjs';
import {
  COLLECTION_NAME_MY_COLLECTION,
  COLLECTION_NAME_USER_PROFILE,
} from '/lib/appConstants.mjs';
import { TENANT_STATUS_URI } from '/lib/environmentLib.mjs';

try {
  // Delete collections before the user's roles!
  removeCollections(
    [COLLECTION_NAME_MY_COLLECTION, COLLECTION_NAME_USER_PROFILE],
    USERNAME_FOR_BONNIE,
  );
  removeExclusiveRolesByUsername(USERNAME_FOR_BONNIE);

  // Delete our sample doc.
  // Using invoke as this module is not otherwise happy declaring the update.
  if (fn.docAvailable(FOO_URI)) {
    xdmp.invokeFunction(() => {
      declareUpdate();
      console.log(`Deleting '${FOO_URI}'...`);
      xdmp.documentDelete(FOO_URI);
    });
  }

  // Delete the tenant status document.
  if (fn.docAvailable(TENANT_STATUS_URI)) {
    xdmp.invokeFunction(() => {
      declareUpdate();
      console.log(`Deleting '${TENANT_STATUS_URI}'...`);
      xdmp.documentDelete(TENANT_STATUS_URI);
    });
  }
} catch (e) {
  console.error(
    `securityLibTests/suiteTeardown.mjs encountered an error: ${e.message}`,
  );
  console.dir(e);
}
