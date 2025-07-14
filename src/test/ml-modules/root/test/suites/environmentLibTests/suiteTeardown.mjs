declareUpdate();

import { TENANT_STATUS_URI } from '/lib/environmentLib.mjs';

try {
  // Delete the tenant status document.
  if (fn.docAvailable(TENANT_STATUS_URI)) {
    console.log(`Deleting '${TENANT_STATUS_URI}'...`);
    xdmp.documentDelete(TENANT_STATUS_URI);
  }
} catch (e) {
  console.error(
    `environmentLibTests/suiteTeardown.mjs encountered an error: ${e.message}`
  );
  console.dir(e);
}
