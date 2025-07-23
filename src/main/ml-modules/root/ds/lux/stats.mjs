import { handleRequest } from '../../lib/securityLib.mjs';
import { getSearchScope, getSearchScopeNames } from '../../lib/searchScope.mjs';
import { COLLECTION_NAME_MY_COLLECTIONS_FEATURE } from '../../lib/appConstants.mjs';
import {
  getMyCollectionDocumentCount,
  getUserProfileDocumentCount,
} from '../../lib/environmentLib.mjs';
import { sortObj } from '../../utils/utils.mjs';

const unitName = external.unitName;

handleRequest(function () {
  const start = new Date();

  const restrictByProductionMode = true;
  const doc = {
    estimates: {
      searchScopes: {
        myCollection: getMyCollectionDocumentCount(restrictByProductionMode),
        userProfile: getUserProfileDocumentCount(restrictByProductionMode),
      },
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

  doc.estimates.searchScopes = sortObj(doc.estimates.searchScopes);

  const end = new Date();
  doc.metadata.timestamp = end;
  doc.metadata.milliseconds = end - start;
  return doc;
}, unitName);
