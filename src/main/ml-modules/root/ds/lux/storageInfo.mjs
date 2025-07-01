import { handleRequest } from '../../lib/securityLib.mjs';
import { getStorageInfo } from '../../lib/environmentLib.mjs';

const response = handleRequest(function () {
  return getStorageInfo();
});

export default response;
