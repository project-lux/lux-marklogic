import { handleRequest } from '../../../lib/securityLib.mjs';
import { getTenantStatus } from '../../../lib/environmentLib.mjs';

handleRequest(getTenantStatus);
