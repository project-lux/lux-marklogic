import { handleRequest } from '../../lib/securityLib.mjs';
import { getSearchScope, getSearchScopeNames } from '../../lib/searchScope.mjs';

const unitName = external.unitName;

handleRequest(function () {
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
      cts.jsonPropertyValueQuery('dataType', getSearchScope(name).types, [
        'exact',
      ])
    );
  });

  const end = new Date();
  doc.metadata.timestamp = end;
  doc.metadata.milliseconds = end - start;
  return doc;
}, unitName);
