import { handleRequest } from '../../lib/securityLib.mjs';
import { getScopeEstimates } from '../../lib/environmentLib.mjs';

const unitName = external.unitName;

const response = handleRequest(function () {
  const start = new Date();
  const end = new Date();
  return {
    estimates: {
      searchScopes: getScopeEstimates(),
    },
    metadata: {
      timestamp: end,
      milliseconds: end - start,
    },
  };
}, unitName);

response;
export default response;
