declareUpdate();

import { setTenantStatus } from '/lib/environmentLib.mjs';

// Create the tenant status document.
setTenantStatus(false, false);
