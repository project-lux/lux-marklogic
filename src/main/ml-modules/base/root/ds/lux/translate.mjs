import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { SearchCriteriaProcessor } from '../../lib/SearchCriteriaProcessor.mjs';

const searchCriteria = external.q;
const searchScope = external.scope;

handleRequest(function () {
  return SearchCriteriaProcessor.translateStringGrammarToJSON(
    searchScope,
    searchCriteria
  );
});
