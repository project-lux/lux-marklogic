import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { getSearchScope, getSearchScopeNames } from '../../lib/searchScope.mjs';

handleRequest(function () {
  const start = new Date();
  const doc = {
    estimates: {
      searchScopes: {},
    },
    metadata: {},
  };

  getSearchScopeNames().forEach((name) => {
    doc.estimates.searchScopes[name] =
      // if scope is work, use custom query to ignore Collection Sets from the estimate.
      name === 'work'
        ? cts.estimate(
            cts.orQuery([
              cts.jsonPropertyValueQuery(
                'dataType',
                ['LinguisticObject'],
                ['exact']
              ),
              cts.andQuery([
                cts.jsonPropertyValueQuery('dataType', ['Set'], ['exact']),
                cts.notQuery(
                  cts.jsonPropertyScopeQuery(
                    'json',
                    cts.jsonPropertyScopeQuery(
                      'classified_as',
                      cts.jsonPropertyScopeQuery(
                        'equivalent',
                        cts.jsonPropertyValueQuery(
                          'id',
                          // this is the aat for collection
                          'http://vocab.getty.edu/aat/300025976',
                          ['exact']
                        )
                      )
                    )
                  )
                ),
              ]),
              cts.jsonPropertyValueQuery('dataType', ['VisualItem'], ['exact']),
            ])
          )
        : // else, scope is not work, so just estimate based on dataType
          cts.estimate(
            cts.jsonPropertyValueQuery('dataType', getSearchScope(name).types, [
              'exact',
            ])
          );
  });

  const end = new Date();
  doc.metadata.timestamp = end;
  doc.metadata.milliseconds = end - start;
  return doc;
});
