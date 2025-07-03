declareUpdate();

import { FOO_URI, USERNAME_FOR_BONNIE } from '/test/unitTestConstants.mjs';
import { removeExclusiveRolesByUsername } from '/test/unitTestUtils.mjs';
import { TENANT_STATUS_URI } from '/lib/environmentLib.mjs';

try {
  // Delete our sample doc.
  if (fn.docAvailable(FOO_URI)) {
    console.log(`Deleting '${FOO_URI}'...`);
    xdmp.documentDelete(FOO_URI);
  }

  // Delete the tenant status document.
  if (fn.docAvailable(TENANT_STATUS_URI)) {
    console.log(`Deleting '${TENANT_STATUS_URI}'...`);
    xdmp.documentDelete(TENANT_STATUS_URI);
  }

  // Delete Bonnie's exclusive roles.
  removeExclusiveRolesByUsername(USERNAME_FOR_BONNIE);
} catch (e) {
  console.error(
    `securityLibTests/suiteTeardown.mjs encountered an error: ${e.message}`
  );
  console.dir(e);
}
