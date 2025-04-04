import { getObjectFromJson } from '../../../utils/utils.mjs';
import { handleRequest } from '../../../lib/securityLib.mjs';
import { createSet } from '../../../lib/setLib.mjs';

const unitName = external.unitName;
const doc = getObjectFromJson(external.doc);

handleRequest(function () {
  declareUpdate();
  return createSet(doc);
}, unitName);
