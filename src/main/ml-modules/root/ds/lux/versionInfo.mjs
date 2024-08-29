import { CODE_VERSION } from '../../lib/appConstants.mjs';
import { handleRequest } from '../../lib/requestHandleLib.mjs';

handleRequest(function () {
  return {
    codeVersion: CODE_VERSION,
    dataVersion: _getDataConversionDate(),
    mlVersion: xdmp.version(),
    databaseName: xdmp.databaseName(xdmp.database()),
  };
});

function _getDataConversionDate() {
  try {
    return fn
      .head(
        cts
          .doc(
            fn.head(
              sem.sparql(`
      prefix la: <https://linked.art/ns/terms/>
      
      SELECT DISTINCT ?objectIri WHERE {
        ?objectIri la:equivalent <http://vocab.getty.edu/ulan/500303558> ;
      }
      `)
            ).objectIri
          )
          .xpath('/admin/conversion-date')
      )
      .toString();
  } catch (e) {
    throw new Error(
      "Can't get data version. Admin to check if there is a document matching expected criteria."
    );
  }
}
