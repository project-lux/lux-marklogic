import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { getStorageInfo } from '../../lib/environmentLib.mjs';

handleRequest(function () {
  return getStorageInfo();
});
