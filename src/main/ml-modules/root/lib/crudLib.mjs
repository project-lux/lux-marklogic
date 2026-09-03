import { applyProfile } from '/lib/profileDocLib.mjs';
import { NotFoundError } from '/lib/errorClasses.mjs';

const DEFAULT_LANG = 'en';

function readDocument(uri, profile = null, lang = DEFAULT_LANG) {
  if (fn.docAvailable(uri)) {
    const docNode = cts.doc(uri);
    return applyProfile(docNode, profile, lang);
  } else {
    throw new NotFoundError(`Document '${uri}' not found`);
  }
}

export { readDocument };
