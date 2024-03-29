import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { getFacets } from '../../lib/facetsLib.mjs';

const name = external.name;
const searchCriteria = external.q;
const searchScope = external.scope;

handleRequest(function () {
  return getFacets({
    name,
    searchCriteria,
    searchScope,
  });
});
