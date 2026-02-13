import { handleRequest } from '../../lib/securityLib.mjs';
import { scaleOut } from '../../lib/scalingLib.mjs';

const dynamicHost = external.dynamicHost;

const response = handleRequest(function () {
  return scaleOut(dynamicHost);
});

response;
export default response;
