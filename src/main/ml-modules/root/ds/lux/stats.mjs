import { handleRequest } from '../../lib/securityLib.mjs';
import { getSearchScope, getSearchScopeNames } from '../../lib/searchScope.mjs';
import { COLLECTION_NAME_MY_COLLECTIONS_FEATURE } from '../../lib/appConstants.mjs';

const unitName = external.unitName;

const response = handleRequest(function () {
  const start = new Date();
  const doc = {
    estimates: {
      searchScopes: {},
    },
    metadata: {},
  };

  const statsOnly = true;
  getSearchScopeNames(statsOnly).forEach((name) => {
    doc.estimates.searchScopes[name] = cts.estimate(
      cts.andNotQuery(
        cts.jsonPropertyValueQuery('dataType', getSearchScope(name).types, [
          'exact',
        ]),
        // Excludes My Collection and user profile documents.
        cts.collectionQuery(COLLECTION_NAME_MY_COLLECTIONS_FEATURE)
      )
    );
  });

  const end = new Date();
  doc.metadata.timestamp = end;
  doc.metadata.milliseconds = end - start;
  return doc;
}, unitName);

response;
export default response;
