import {
  ANN_TOP_K_SEED_URI,
  FACET_CURATOR_URI,
  FACET_ITEM_URI,
  FACET_SET_URI,
} from '/test/unitTestConstants.mjs';

const seedUris = [
  ANN_TOP_K_SEED_URI,
  FACET_ITEM_URI,
  FACET_SET_URI,
  FACET_CURATOR_URI,
];

try {
  for (const uri of seedUris) {
    if (fn.docAvailable(uri)) {
      xdmp.invokeFunction(() => {
        declareUpdate();
        console.log(`Deleting '${uri}'...`);
        xdmp.documentDelete(uri);
      });
    }
  }
} catch (e) {
  console.error(
    `searchCriteriaProcessorTests/suiteTeardown.mjs encountered an error: ${e.message}`,
  );
  console.dir(e);
}
