import { handleRequest } from '../../../lib/securityLib.mjs';
import { getTenantStatus } from '../../../lib/environmentLib.mjs';

const response = handleRequest(getTenantStatus);
export default response;
