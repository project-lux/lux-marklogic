import { handleRequest } from '../../lib/securityLib.mjs';
import { getAdvancedSearchConfig } from '../../config/advancedSearchConfig.mjs';

const response = handleRequest(function () {
  return getAdvancedSearchConfig();
});

response;
export default response;
