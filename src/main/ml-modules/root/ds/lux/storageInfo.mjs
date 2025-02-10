import { handleRequest } from '../../lib/requestHandleLib.mjs';
import environmentLib from '../../lib/environmentLib.mjs';

handleRequest(function () {
  return environmentLib.getStorageInfo();
});
