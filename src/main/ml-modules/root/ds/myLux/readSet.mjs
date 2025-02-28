import { get } from '../../lib/crudLib.mjs';
import { handleRequest } from '../../lib/requestHandleLib.mjs';

const uri = external.uri;
const profile = external.profile;
const lang = external.lang;
const unitName = external.unitName;
handleRequest(function () {
  console.log(
    `Roles from within data service-provided function: ${xdmp
      .getCurrentRoles()
      .toArray()
      .map((id) => {
        return xdmp.roleName(id);
      })
      .join(', ')}`
  );
  console.log(
    'Doc available, from within data service-provided function ?= ' +
      fn.docAvailable(
        'https://lux.collections.yale.edu/data/activity/96f72cc4-682e-4c95-baf2-36f142ce3fc1'
      )
  );
  return get(uri, profile, lang);
}, unitName);
