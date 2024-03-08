// Triple and document visibility test for when document permissions restrict a user's visibility.
// Works for triples embedded in their source documents as well as defined in standalone documents.
// Superset of what triple-visibility-by-user.js does.
//
// Directions:
//
//   1. Deploy the embedded and standalone triples ML Gradle projects.
//   2. If not part of the deployment, load the data for each project (via mlLoadData).
//   3. Paste this query into the query console.
//   4. Set the database to standalone-triples-content or embedded-triples-content, depending on
//      testing standalone vs.embedded triples.
//   5. Review/update the rest of the script configuration section, then run.
//   6. If/when desired, change to the other database and run again.
//
// Assumptions/prerequisites/limitations/notes:
//
//   1. URIs are the same as IRIs.
//   2. Only traverses related documents via single predicate.
//   3. If you want to use this with different users, set outside the script configuration section.
//
'use strict';

// START: Script configuration
const predicate = 'isRelatedTo';
const includeCurrentUser = false;
const includeRawData = false;
const maxHops = 3;
// END: Script configuration

const embeddedTriplesMode =
  'embedded-triples-content' == xdmp.databaseName(xdmp.database());
const usernames = embeddedTriplesMode
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

function getFieldValues() {
  return cts.fieldValues('indexedValues');
}

function getTraversalResults(uris, level) {
  const traversalResults = {
    visible: [],
    invisible: [],
  };
  uris.forEach((uri) => {
    if (fn.docAvailable(uri)) {
      if (level < maxHops) {
        traversalResults.visible.push({
          uri,
          connections: getConnections(cts.documentQuery(uri), level + 1),
        });
      } else {
        traversalResults.visible.push(uri);
      }
    } else {
      traversalResults.invisible.push(uri);
    }
  });
  return traversalResults;
}

function getConnections(ctsQuery = cts.andQuery([]), level = 1) {
  const triples = cts
    .triples([], sem.iri(predicate), [], [], [], ctsQuery)
    .toArray();
  let objectUris = [];
  for (const result of triples) {
    const uri = result.toObject().triple.object;
    objectUris.push(uri);
  }
  objectUris = [...new Set(objectUris)].sort();
  const objectTraversalResults = getTraversalResults(objectUris, level);

  const subjectQuery = cts.tripleRangeQuery(
    [],
    sem.iri(predicate),
    objectUris.map((uri) => sem.iri(uri)).concat('/does/not/exist') // ensure there is at least one.
  );
  const docs = cts.search(subjectQuery).toArray();
  let subjectUris = [];
  for (const doc of docs) {
    subjectUris.push(fn.baseUri(doc));
  }
  subjectUris = [...new Set(subjectUris)].sort();
  const subjectTraversalResults = getTraversalResults(subjectUris, level);

  const connections = {
    level,
    triples: {
      count: objectUris.length,
      objects: objectTraversalResults,
    },
    tripleRangeQuery: {
      count: subjectUris.length,
      subjects: subjectTraversalResults,
    },
  };

  return connections;
}

function getPaths(hasAccess, items, path = '') {
  let paths = [];
  items.forEach((item) => {
    if (item.uri != undefined) {
      const extendedPath = (path.length > 0 ? path + ' > ' : '') + item.uri;

      // Always process visible arrays.
      const arr = item.connections.triples.objects.visible;
      if (arr.length > 0) {
        paths = paths.concat(getPaths(hasAccess, arr, extendedPath));
      } else if (hasAccess) {
        paths.push(extendedPath + ' --no triples');
      }

      // If not in visible mode, tack on invisible items now
      if (!hasAccess) {
        paths = paths.concat(
          item.connections.triples.objects.invisible.map(
            (invisible) => extendedPath + ' > ' + invisible
          )
        );
      }
    } else if (hasAccess) {
      paths.push(path + ' > ' + item);
    }
  });
  return paths;
}

const findings = {
  predicate,
  maxHops,
  includeRawData,
  includeCurrentUser,
  usernames,
  userAccess: [],
};
usernames.forEach((username) => {
  const userAccess = {
    username,
    fieldValues: embeddedTriplesMode ? [] : 'not applicable',
    hasAccessToLastDoc: [],
    noAccessToLastDoc: [],
    connections: xdmp
      .invokeFunction(getConnections, { userId: xdmp.user(username) })
      .toArray()[0],
  };
  if (embeddedTriplesMode) {
    userAccess.fieldValues = xdmp
      .invokeFunction(getFieldValues, { userId: xdmp.user(username) })
      .toArray()[0];
  }
  userAccess.hasAccessToLastDoc = getPaths(
    true,
    userAccess.connections.triples.objects.visible
  );
  userAccess.noAccessToLastDoc = getPaths(
    false,
    userAccess.connections.triples.objects.visible
  );
  if (!includeRawData) {
    delete userAccess.connections;
  }
  findings.userAccess.push(userAccess);
});
findings;
