// Triple visibility test when document permissions restrict a user's visibility.
// Works for triples embedded in their source documents as well as defined in standalone documents.
// Subset of what triple-and-doc-visibility-by-user.js does.
//
// Directions:
//
//   1. Deploy the embedded and standalone triples ML Gradle projects.
//   2. Load the data for each project (via mlLoadData).
//   3. Paste this query into the query console.
//   4. Set the database to standalone-triples-content or embedded-triples-content, depending on testing standalone vs.embedded triples.
//   5. Review/update the rest of the script configuration section, then run.
//   6. If/when desired, change to the other database and run again.
//
// Assumptions/prerequisites/limitations/notes:
//
//   1. URIs are the same as IRIs.
//   2. Only traverses related documents via single predicate.
//   3. If you want to use this with different roles, set outside the script configuration section.
//
'use strict';

// START: Script configuration
const predicate = 'isRelatedTo';
const includeCurrentUser = false;
// END: Script configuration

const usernames =
  'embedded-triples-content' == xdmp.databaseName(xdmp.database())
    ? [
        'embedded-triples-lux',
        'embedded-triples-slice01',
        'embedded-triples-slice02',
      ]
    : [
        'standalone-triples-lux',
        'standalone-triples-slice01',
        'standalone-triples-slice02',
      ];
if (includeCurrentUser && !usernames.includes(xdmp.getCurrentUser())) {
  usernames.push(xdmp.getCurrentUser());
}

function getTriples() {
  return cts.triples([], sem.iri(predicate), []);
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
