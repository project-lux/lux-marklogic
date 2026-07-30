import { handleRequest } from '../../lib/securityLib.mjs';
import { search } from '../../lib/searchLib.mjs';

const unitName = external.unitName;
const searchCriteria = external.q;
const searchScope = external.scope;
const page = external.page;
const pageLength = external.pageLength;
const pageWith = external.pageWith;
const sortDelimitedStr = external.sort || '';
const filterResults = external.filterResults;

const response = handleRequest(function () {
  return search({
    searchCriteria,
    searchScope,
    page,
    pageLength,
    pageWith,
    requestContext: 'endpoint',
    sortDelimitedStr,
    filterResults,
  });
}, unitName);

response;
export default response;
