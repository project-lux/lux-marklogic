import { handleRequest } from '../../lib/securityLib.mjs';
import { SearchCriteriaProcessor as SCP } from '../../lib/SearchCriteriaProcessor.mjs';

const searchCriteria = external.q;
const searchScope = external.scope;

const response = handleRequest(function () {
  return SCP.translateStringGrammarToJSON(searchScope, searchCriteria);
});

response;
export default response;
