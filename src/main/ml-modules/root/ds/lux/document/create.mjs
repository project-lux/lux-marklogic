import { handleRequest } from '../../../lib/securityLib.mjs';
import { createDocument } from '../../../lib/crudLib.mjs';

const unitName = external.unitName;
const docNode = external.doc; // Do not use getObjectFromNode
const lang = external.lang;

const response = handleRequest(function () {
  declareUpdate();
  const newUserMode = false;
  return createDocument(docNode, newUserMode, lang);
}, unitName);

export default response;
