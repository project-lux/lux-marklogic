import { get } from '../../lib/crudLib.mjs';
import { handleRequest } from '../../lib/securityLib.mjs';

const unitName = external.unitName;
const uri = external.uri;
const profile = external.profile;
const lang = external.lang;
handleRequest(function () {
  return get(uri, profile, lang);
}, unitName);
