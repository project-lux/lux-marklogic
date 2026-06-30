declareUpdate();

import {
  ANN_TOP_K_SEED_FILENAME,
  ANN_TOP_K_SEED_URI,
} from '/test/unitTestConstants.mjs';
import { ML_APP_NAME } from '/lib/appConstants.mjs';
import { loadTestFile } from '/test/unitTestUtils.mjs';

try {
  loadTestFile(ANN_TOP_K_SEED_URI, ANN_TOP_K_SEED_FILENAME, [ML_APP_NAME]);
} catch (e) {
  console.error(
    `searchCriteriaProcessorTests/suiteSetup.mjs encountered an error: ${e.message}`,
  );
  console.dir(e);
}
