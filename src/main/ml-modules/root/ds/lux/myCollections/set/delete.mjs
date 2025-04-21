import { handleRequest } from '../../../../lib/securityLib.mjs';
import { deleteSet } from '../../../../lib/setLib.mjs';

const uri = external.uri;

handleRequest(function () {
  declareUpdate();
  return deleteSet(uri);
});
