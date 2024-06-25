import { handleRequest } from '../../lib/requestHandleLib.mjs';
import { getPersonRolesInfo } from '../../utils/utils.mjs';

const uri = external.uri;
handleRequest(function () {
  return getPersonRolesInfo(uri);
});
