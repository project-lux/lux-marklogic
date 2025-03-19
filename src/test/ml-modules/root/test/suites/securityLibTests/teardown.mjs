declareUpdate();

import { FOO_URI } from '/unitTestConstants.mjs';

if (fn.docAvailable(FOO_URI)) {
  console.log(`Deleting '${FOO_URI}'`);
  xdmp.documentDelete(FOO_URI);
}
