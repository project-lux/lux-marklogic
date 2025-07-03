import { handleRequest } from '../../../lib/securityLib.mjs';
import { setTenantStatus } from '../../../lib/environmentLib.mjs';

const roleName = external.roleName;
const readOnly = external.readOnly;

const unitName = null; // Irrelevant for this operation.
const forceInvoke = true; // Required.

// No need to support unitName.
handleRequest(
  function () {
    declareUpdate();
    return setTenantStatus(roleName, readOnly);
  },
  unitName,
  forceInvoke
);
