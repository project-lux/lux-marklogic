import { handleRequest } from '../../lib/securityLib.mjs';
import { search } from '../../lib/searchLib.mjs';

const unitName = external.unitName;
const searchCriteria = external.q;
const searchScope = external.scope;
const mayChangeScope = external.mayChangeScope;
const page = external.page;
const pageLength = external.pageLength;
const pageWith = external.pageWith;
const mayExceedMaximumPageLength = false;
const sortDelimitedStr = external.sort || '';
const filterResults = external.filterResults;
const facetsSoon = external.facetsSoon;
const synonymsEnabled = external.synonymsEnabled;

handleRequest(function () {
  return search({
    searchCriteria,
    searchScope,
    mayChangeScope,
    page,
    pageLength,
    pageWith,
    requestContext: 'endpoint',
    mayExceedMaximumPageLength,
    sortDelimitedStr,
    filterResults,
    facetsSoon,
    synonymsEnabled,
  });
}, unitName);
