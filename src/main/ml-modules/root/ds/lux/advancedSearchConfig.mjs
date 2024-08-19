import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { getAdvancedSearchConfig } from '../../config/advancedSearchConfig.mjs';

handleRequest(function () {
  return getAdvancedSearchConfig();
});
