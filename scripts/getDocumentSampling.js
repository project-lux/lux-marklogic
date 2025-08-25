/*
 * This script may be used to get a sampling of document URIs by one or more collections,
 * plus additional constraints (optional).  Configure the variables within the script
 * configuration section and execute.
 */

// START: Script configuration
//
// To require documents in multiple collections delimit with " and "; e.g., "coll1 and coll2".
// For all collections, use cts.collections().toArray()
const collectionNames = ['lux-by-unit', 'ycba', 'yuag', 'ycba and yuag'];
// CTS query for additional constraints; use cts.trueQuery() for none.
const additionalQuery = cts.trueQuery();
const maxPerCollection = 5;
const randomize = true;
// END: Script configuration

const collections = {};
const getCollectionInfo = (names) => {
  const ctsQuery = cts.andQuery([
    names.split(' and ').map((name) => {
      return cts.collectionQuery(name.trim());
    }),
    additionalQuery,
  ]);
  const estimate = cts.estimate(ctsQuery);

  const start =
    randomize && estimate > maxPerCollection
      ? xdmp.random(estimate - maxPerCollection)
      : 1;

  collections[names] = {
    estimate,
    sampling: fn
      .subsequence(cts.uris('', null, ctsQuery), start, maxPerCollection)
      .toArray(),
  };
};

// Populate collections.
collectionNames.forEach((name) => getCollectionInfo(name));

collections;
export default collections;
