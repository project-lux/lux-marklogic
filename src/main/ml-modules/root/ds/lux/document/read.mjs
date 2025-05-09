import { handleRequest } from '../../../lib/securityLib.mjs';
import { readDocument } from '../../../lib/crudLib.mjs';

const unitName = external.unitName;
const uri = external.uri;
const profile = external.profile;
const lang = external.lang;
handleRequest(function () {
  return readDocument(uri, profile, lang);
}, unitName);
