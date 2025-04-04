import { getObjectFromNode } from '../../utils/utils.mjs';
import { handleRequest } from '../../lib/securityLib.mjs';
import { determineIfSearchWillMatch } from '../../lib/searchLib.mjs';

const unitName = external.unitName;
const multipleSearchCriteria = getObjectFromNode(external.q);

handleRequest(function () {
  return determineIfSearchWillMatch(multipleSearchCriteria);
}, unitName);
