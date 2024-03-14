// Find out which users can see which triples, restricted by one or more predicates and an optional
// maximum number of triples.  Created while vetting the LUX Data Slice design with a small amount
// of data.  Offers a subset of what checkTripleAndDocVisibilityByUser.js can do.
//
// Directions until LUX supports data slices:
//
//   1. Deploy the main ML Gradle project after updating mlConfigPaths and mlConfigPaths to include
//      the associated data slice directories.
//   2. Run mlLoadData to load sample records that one or more of the data roles has access to.
//   3. Paste this query into the query console.
//   4. Set the database to lux-content.
//   5. Review/update the rest of the script configuration section, then run.
//   6. If/when desired, change to the other database and run again.
//
// Assumptions/prerequisites/limitations/notes:
//
//   1. URIs are the same as IRIs.
//
'use strict';

const op = require('/MarkLogic/optic');
const lux = op.prefixer('https://lux.collections.yale.edu/ns/');

// START: Script configuration
const predicates = [lux('isRelatedTo')];
const maxTriples = 20; // Set to null for all, all but be careful what you ask for :)
const includeCurrentUser = false;
const usernames = ['data-lux', 'data-slice01', 'data-slice02'];
// END: Script configuration

if (includeCurrentUser && !usernames.includes(xdmp.getCurrentUser())) {
  usernames.push(xdmp.getCurrentUser());
}

function getTriples() {
  return fn.subsequence(
    cts.triples(
      [],
      predicates.map((predicate) => {
        return sem.iri(predicate);
      }),
      []
    ),
    1,
    maxTriples
  );
}

const results = [];
usernames.forEach((username) => {
  const triples = xdmp
    .invokeFunction(getTriples, { userId: xdmp.user(username) })
    .toArray();
  results.push({
    username,
    count: triples.length,
    triples: triples,
  });
});
results;
