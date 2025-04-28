import { handleRequest } from '../../../lib/securityLib.mjs';
import { createSet } from '../../../lib/setLib.mjs';

const unitName = external.unitName;
const docNode = external.doc; // Do not use getObjectFromNode
const lang = external.lang;

handleRequest(function () {
  declareUpdate();
  return createSet(docNode, lang);
}, unitName);
