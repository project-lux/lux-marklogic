import { getObjectFromNode } from '/utils/utils.mjs';
import { handleRequest } from '/lib/securityLib.mjs';
import { getSearchEstimate } from '/lib/searchLib.mjs';

const searchCriteria = getObjectFromNode(external.q);
const scope = external.scope;

const response = handleRequest(function () {
  return getSearchEstimate(searchCriteria, scope);
});

response;
export default response;
