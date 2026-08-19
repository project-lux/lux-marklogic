import { FOO_FILENAME, FOO_URI } from '/test/unitTestConstants.mjs';
import { loadTestFile } from '/test/unitTestUtils.mjs';

// Does not require declareUpdate();
loadTestFile(FOO_URI, FOO_FILENAME);
