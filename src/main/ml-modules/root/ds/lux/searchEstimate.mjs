import { getObjectFromJson } from '../../utils/utils.mjs';
import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { getSearchEstimate } from '../../lib/searchLib.mjs';

const unitName = external.unitName;
const searchCriteria = getObjectFromJson(external.q);
const scope = external.scope;

handleRequest(function () {
  return getSearchEstimate(searchCriteria, scope);
}, unitName);
