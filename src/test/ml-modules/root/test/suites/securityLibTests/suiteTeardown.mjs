import { FOO_URI } from '/test/unitTestConstants.mjs';

try {
  // Delete our sample doc.
  // Using invoke as this module is not otherwise happy declaring the update.
  if (fn.docAvailable(FOO_URI)) {
    xdmp.invokeFunction(() => {
      declareUpdate();
      console.log(`Deleting '${FOO_URI}'...`);
      xdmp.documentDelete(FOO_URI);
    });
  }
} catch (e) {
  console.error(
    `securityLibTests/suiteTeardown.mjs encountered an error: ${e.message}`,
  );
  console.dir(e);
}
