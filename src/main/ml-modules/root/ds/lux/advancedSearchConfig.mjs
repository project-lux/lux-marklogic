import { handleRequest } from '../../lib/securityLib.mjs';
import { getAdvancedSearchConfig } from '../../config/advancedSearchConfig.mjs';

const unitName = external.unitName;
const response = handleRequest(function () {
  return getAdvancedSearchConfig();
}, unitName);

export default response;
