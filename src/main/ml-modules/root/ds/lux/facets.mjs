import { handleRequest } from '../../lib/securityLib.mjs';
import { SearchCriteriaProcessor } from '../../lib/SearchCriteriaProcessor.mjs';
import { FacetRequests } from '../../lib/search/FacetRequests.mjs';

const unitName = external.unitName;
const name = external.name;
const searchCriteria = external.q;
const searchScope = external.scope;
const page = external.page;
const pageLength = external.pageLength;
const sort = external.sort;

const response = handleRequest(function () {
  const searchCriteriaProcessor = new SearchCriteriaProcessor(false);
  searchCriteriaProcessor.prepare(
    searchCriteria,
    searchScope,
    false, // allowMultiScope
    null, // patternOptions
    true, // includeTypeConstraint
    1, // page for search results
    1, // pageLength for search results
    null, // pageWith
    null, // sortCriteria
    false, // valuesOnly
  );

  const facetRequests = new FacetRequests(page, pageLength);
  facetRequests.addFacetRequest(name, sort);

  const searchExecutionResult = searchCriteriaProcessor.execute(facetRequests);
  const facetResponses = searchExecutionResult.getFacets();
  return facetResponses ? facetResponses.getFacet(name) : null;
}, unitName);

response;
export default response;
