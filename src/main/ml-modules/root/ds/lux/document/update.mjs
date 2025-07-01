import { handleRequest } from '../../../lib/securityLib.mjs';
import { updateDocument } from '../../../lib/crudLib.mjs';

const unitName = external.unitName;
const uri = external.uri;
const docNode = external.doc; // Do not use getObjectFromNode
const lang = external.lang;

const response = handleRequest(function () {
  declareUpdate();
  return updateDocument(uri, docNode, lang);
}, unitName);

export default response;
