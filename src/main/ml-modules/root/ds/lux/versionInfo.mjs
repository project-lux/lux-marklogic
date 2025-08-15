import { handleRequest } from '../../lib/securityLib.mjs';
import { getVersionInfo } from '../../lib/environmentLib.mjs';

const response = handleRequest(getVersionInfo);

response;
export default response;
