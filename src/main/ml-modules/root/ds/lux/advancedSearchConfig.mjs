import { handleRequest } from '../../lib/securityLib.mjs';
import { getAdvancedSearchConfig } from '../../config/advancedSearchConfig.mjs';

const unitName = external.unitName;
handleRequest(function () {
  return getAdvancedSearchConfig();
}, unitName);
