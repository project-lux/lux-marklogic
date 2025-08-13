import { handleRequest } from '../../../lib/securityLib.mjs';
import { deleteDocument } from '../../../lib/crudLib.mjs';

const uri = external.uri;

const response = handleRequest(function () {
  declareUpdate();
  return deleteDocument(uri);
});

response;
export default response;
