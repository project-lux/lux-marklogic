import { getObjectFromJson } from '../../utils/utils.mjs';
import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { determineIfSearchWillMatch } from '../../lib/searchLib.mjs';

const multipleSearchCriteria = getObjectFromJson(external.q);

handleRequest(function () {
  return determineIfSearchWillMatch(multipleSearchCriteria);
});
