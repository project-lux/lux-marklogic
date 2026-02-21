import { handleRequest } from '../../lib/securityLib.mjs';
import { scaleOut } from '../../lib/scalingLib.mjs';

const dynamicHost = external.dynamicHost;

handleRequest(function () {
  scaleOut(dynamicHost);
});
