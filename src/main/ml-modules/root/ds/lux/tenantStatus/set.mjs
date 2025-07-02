import {
  handleRequest,
  requireUserMayUpdateTenantStatus,
} from '../../../lib/securityLib.mjs';
import { setTenantStatus } from '../../../lib/environmentLib.mjs';

const roleName = external.roleName;
const readOnly = external.readOnly;

// No harm in asserting here and in the library.
requireUserMayUpdateTenantStatus();

// No need to support unitName.
handleRequest(function () {
  return setTenantStatus(roleName, readOnly);
});
