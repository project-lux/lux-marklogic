import { getObjectFromNode } from '/utils/utils.mjs';
import { handleRequest } from '/lib/securityLib.mjs';
import { determineIfSearchWillMatch } from '/lib/searchLib.mjs';

const multipleSearchCriteria = getObjectFromNode(external.q);

const response = handleRequest(function () {
  return determineIfSearchWillMatch(multipleSearchCriteria);
});

response;
export default response;
