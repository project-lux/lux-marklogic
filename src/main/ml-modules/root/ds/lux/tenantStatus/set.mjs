declareUpdate();

import { handleRequest } from '../../../lib/securityLib.mjs';
import { setTenantStatus } from '../../../lib/environmentLib.mjs';

const prod = external.prod;
const readOnly = external.readOnly;

const unitName = null; // Irrelevant for this operation.
const forceInvoke = true; // Required.

// No need to support unitName.
const response = handleRequest(
  function () {
    declareUpdate();
    return setTenantStatus(prod, readOnly);
  },
  unitName,
  forceInvoke
);

export default response;
