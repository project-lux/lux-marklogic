import { handleRequest } from '../../lib/securityLib.mjs';
import { getFacet } from '../../lib/facetsLib.mjs';

const unitName = external.unitName;
const name = external.name;
const searchCriteria = external.q;
const searchScope = external.scope;
const page = external.page;
const pageLength = external.pageLength;
const sort = external.sort;

const response = handleRequest(function () {
  return getFacet({
    facetName: name,
    searchCriteria,
    searchScope,
    page,
    pageLength,
    sort,
  });
}, unitName);

export default response;
