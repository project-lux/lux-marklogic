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
      .head(cts.doc(fn.head(cts.uris())).xpath('/admin/conversion-date'))
      .toString();
  } catch (e) {
    return 'error';
  }
}
