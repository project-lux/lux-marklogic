'use strict';
// Delete all synthetic filtering test documents.
// Run in Query Console against the TEST CONTENT database.

const COLLECTION = 'filtering-validation';

const uris = cts.uris(null, [], cts.collectionQuery(COLLECTION)).toArray();

for (const uri of uris) {
  xdmp.documentDelete(uri);
}

const results = {
  deleted: uris.length,
  collection: COLLECTION,
  message: `Deleted ${uris.length} documents from collection '${COLLECTION}'.`,
};
export default results;
