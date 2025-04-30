declareUpdate();

import { testHelperProxy } from '/test/test-helper.mjs';
import {
  FOO_URI,
  USERNAME_FOR_REGULAR_USER,
} from '/test/unitTestConstants.mjs';
import { getExclusiveRoleNamesByUsername } from '/lib/securityLib.mjs';
const sec = require('/MarkLogic/security.xqy');

// Delete our sample doc.
if (fn.docAvailable(FOO_URI)) {
  console.log(`Deleting '${FOO_URI}'...`);
  xdmp.documentDelete(FOO_URI);
}

// Delete the regular user's exclusive roles.
const removeRoles = () => {
  declareUpdate();
  getExclusiveRoleNamesByUsername(USERNAME_FOR_REGULAR_USER).forEach(
    (roleName) => {
      if (sec.roleExists(roleName)) {
        console.log(`Deleting the ${roleName} role...`);
        sec.removeRole(roleName);
      }
    }
  );
};
xdmp.invokeFunction(removeRoles, { database: xdmp.securityDatabase() });
