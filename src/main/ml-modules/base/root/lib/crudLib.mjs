import { applyProfile } from './profileDocLib.mjs';
import { NotFoundError } from './mlErrorsLib.mjs';

function get(uri, profile = null, lang = 'en') {
  if (fn.docAvailable(uri)) {
    return applyProfile(cts.doc(uri), profile, lang);
  } else {
    throw new NotFoundError(`Document '${uri}' Not Found`);
  }
}

export { get };
