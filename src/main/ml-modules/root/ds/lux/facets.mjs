import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { getFacet } from '../../lib/facetsLib.mjs';

const name = external.name;
const searchCriteria = external.q;
const searchScope = external.scope;
const page = external.page;
const pageLength = external.pageLength;
const sort = external.sort;

handleRequest(function () {
  return getFacet({
    name,
    searchCriteria,
    searchScope,
    page,
    pageLength,
    sort,
  });
});
