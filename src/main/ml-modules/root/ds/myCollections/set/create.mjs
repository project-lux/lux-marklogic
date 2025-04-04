import { handleRequest } from '../../../lib/securityLib.mjs';
import { createSet } from '../../../lib/setLib.mjs';

const unitName = external.unitName;
const docNode = external.doc; // Do not use getObjectFromNode

handleRequest(function () {
  declareUpdate();
  return createSet(docNode);
}, unitName);
