import { ANN_TOP_K_SEED_URI } from '/test/unitTestConstants.mjs';

try {
  if (fn.docAvailable(ANN_TOP_K_SEED_URI)) {
    xdmp.invokeFunction(() => {
      declareUpdate();
      console.log(`Deleting '${ANN_TOP_K_SEED_URI}'...`);
      xdmp.documentDelete(ANN_TOP_K_SEED_URI);
    });
  }
} catch (e) {
  console.error(
    `searchCriteriaProcessorTests/suiteTeardown.mjs encountered an error: ${e.message}`,
  );
  console.dir(e);
}
