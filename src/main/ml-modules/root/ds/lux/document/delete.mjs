import { handleRequest } from '../../../lib/securityLib.mjs';
import { deleteDocument } from '../../../lib/crudLib.mjs';

const uri = external.uri;

handleRequest(function () {
  declareUpdate();
  deleteDocument(uri);
});
