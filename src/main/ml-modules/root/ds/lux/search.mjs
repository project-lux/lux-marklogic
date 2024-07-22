import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { search } from '../../lib/searchLib.mjs';

const searchCriteria = external.q;
const searchScope = external.scope;
const mayChangeScope = external.mayChangeScope;
const page = external.page;
const pageLength = external.pageLength;
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
    requestContext: 'endpoint',
    mayExceedMaximumPageLength,
    sortDelimitedStr,
    filterResults,
    facetsSoon,
    synonymsEnabled,
  });
});
