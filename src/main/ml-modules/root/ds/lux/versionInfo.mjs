import { handleRequest } from '../../lib/securityLib.mjs';
import { getVersionInfo } from '../../lib/environmentLib.mjs';

handleRequest(getVersionInfo);
