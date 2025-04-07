import { handleRequest } from '../../lib/securityLib.mjs';
import { SearchCriteriaProcessor } from '../../lib/SearchCriteriaProcessor.mjs';

const searchCriteria = external.q;
const searchScope = external.scope;

handleRequest(function () {
  return SearchCriteriaProcessor.translateStringGrammarToJSON(
    searchScope,
    searchCriteria
  );
});
