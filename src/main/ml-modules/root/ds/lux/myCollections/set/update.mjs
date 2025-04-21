import { handleRequest } from '../../../../lib/securityLib.mjs';
import { updateSet } from '../../../../lib/setLib.mjs';

const unitName = external.unitName;
const docNode = external.doc; // Do not use getObjectFromNode
const lang = external.lang;

handleRequest(function () {
  declareUpdate();
  return updateSet(docNode, lang);
}, unitName);
