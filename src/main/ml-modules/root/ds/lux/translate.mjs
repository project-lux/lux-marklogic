import { handleRequest } from '../../lib/securityLib.mjs';
import { SearchCriteriaProcessor } from '../../lib/SearchCriteriaProcessor.mjs';

const searchCriteria = external.q;
const searchScope = external.scope;

const response = handleRequest(function () {
  return SearchCriteriaProcessor.translateStringGrammarToJSON(
    searchScope,
    searchCriteria
  );
});

response;
export default response;
