import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { ADVANCED_SEARCH_CONFIG } from '../../config/advancedSearchConfig.mjs';

handleRequest(function () {
  return ADVANCED_SEARCH_CONFIG;
});
