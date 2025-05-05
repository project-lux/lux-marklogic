declareUpdate();

import {
  FOO_URI,
  USERNAME_FOR_REGULAR_USER,
} from '/test/unitTestConstants.mjs';
import { removeExclusiveRolesByUsername } from '/test/unitTestUtils.mjs';

// Delete our sample doc.
if (fn.docAvailable(FOO_URI)) {
  console.log(`Deleting '${FOO_URI}'...`);
  xdmp.documentDelete(FOO_URI);
}

// Delete the regular user's exclusive roles.
removeExclusiveRolesByUsername(USERNAME_FOR_REGULAR_USER);
