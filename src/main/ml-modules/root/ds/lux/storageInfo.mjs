import { handleRequest } from '../../lib/securityLib.mjs';
import { getStorageInfo } from '../../lib/environmentLib.mjs';

handleRequest(function () {
  return getStorageInfo();
});
