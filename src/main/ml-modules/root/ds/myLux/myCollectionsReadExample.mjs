import { get } from '../../lib/crudLib.mjs';
import { handleRequest } from '../../lib/requestHandleLib.mjs';

const uri = external.uri;
const profile = external.profile;
const lang = external.lang;
const unitName = external.unitName;
handleRequest(function () {
  return get(uri, profile, lang);
}, unitName);
