import { handleRequest } from '../../lib/requestHandleLib.mjs';
import {
  getSearchScopeNames,
  getSearchScopeTypes,
} from '../../lib/searchScope.mjs';
import { removeItemByValueFromArray } from '../../utils/utils.mjs';
import { IDENTIFIERS } from '../../lib/identifierConstants.mjs';

const getDataTypeQuery = (dataTypes) => {
  return cts.jsonPropertyValueQuery('dataType', dataTypes, ['exact']);
};

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
              // Only sets need special treatment.
              getDataTypeQuery(
                removeItemByValueFromArray(getSearchScopeTypes('work'), 'Set')
              ),
              // A field would be more precise but does not appear necessary.
              cts.andQuery([
                getDataTypeQuery('Set'),
                cts.notQuery(
                  cts.jsonPropertyValueQuery('id', IDENTIFIERS.collection)
                ),
              ]),
            ])
          )
        : // else, scope is not work, so just estimate based on dataType
          cts.estimate(getDataTypeQuery(getSearchScopeTypes(name)));
  });

  const end = new Date();
  doc.metadata.timestamp = end;
  doc.metadata.milliseconds = end - start;
  return doc;
});
