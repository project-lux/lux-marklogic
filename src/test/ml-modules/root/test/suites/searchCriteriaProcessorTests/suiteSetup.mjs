declareUpdate();

import {
  ANN_TOP_K_SEED_FILENAME,
  ANN_TOP_K_SEED_URI,
  FACET_CURATOR_FILENAME,
  FACET_CURATOR_URI,
  FACET_ITEM_FILENAME,
  FACET_ITEM_URI,
  FACET_SET_FILENAME,
  FACET_SET_URI,
} from '/test/unitTestConstants.mjs';
import { ML_APP_NAME } from '/lib/appConstants.mjs';
import { loadTestFile } from '/test/unitTestUtils.mjs';

try {
  loadTestFile(ANN_TOP_K_SEED_URI, ANN_TOP_K_SEED_FILENAME, [ML_APP_NAME]);
  loadTestFile(FACET_ITEM_URI, FACET_ITEM_FILENAME, [ML_APP_NAME]);
  loadTestFile(FACET_SET_URI, FACET_SET_FILENAME, [ML_APP_NAME]);
  loadTestFile(FACET_CURATOR_URI, FACET_CURATOR_FILENAME, [ML_APP_NAME]);
} catch (e) {
  console.error(
    `searchCriteriaProcessorTests/suiteSetup.mjs encountered an error: ${e.message}`,
  );
  console.dir(e);
}
