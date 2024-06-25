import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { IRIs } from '../../lib/dataConstants.mjs';

handleRequest(function () {
  return IRIs;
});
