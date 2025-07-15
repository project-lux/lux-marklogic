declareUpdate();

import { HMO_FILENAME, HMO_URI } from '/test/unitTestConstants.mjs';
import { setTenantStatus } from '/lib/environmentLib.mjs';
import { loadTestFile } from '/test/unitTestUtils.mjs';

setTenantStatus(false, false);

loadTestFile(HMO_URI, HMO_FILENAME);
