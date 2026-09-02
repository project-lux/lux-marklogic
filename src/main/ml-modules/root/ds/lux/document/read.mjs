import { handleRequest } from '/lib/securityLib.mjs';
import { readDocument } from '/lib/crudLib.mjs';

const uri = external.uri;
const profile = external.profile;
const lang = external.lang;
const response = handleRequest(function () {
  return readDocument(uri, profile, lang);
});

response;
export default response;
