// Find out which users can see which triples and documents, restricted by a single predicate and
// maximum number of hops.  Created while vetting the LUX Data Slice design with a small amount
// of data.  Offers a superset of what checkTripleVisibilityByUser.js can do.
//
// Directions until LUX supports data slices:
//
//   1. Deploy the main ML Gradle project.  This includes data-* roles and users.
//   2. Run mlLoadData to load sample records that one or more of the data roles has access to.
//   3. Paste this query into the query console.
//   4. Set the database to lux-content.
//   5. Review/update the rest of the script configuration section, then run.
//   6. If/when desired, change to the other database and run again.
//
// Assumptions/prerequisites/limitations/notes:
//
//   1. URIs are the same as IRIs.
//   2. Limited to a single predicate but can modified to support multiple.
//
'use strict';

const op = require('/MarkLogic/optic');
const lux = op.prefixer('https://lux.collections.yale.edu/ns/');

// START: Script configuration
const predicate = lux('isRelatedTo');
const maxHops = 3;
const usernames = ['data-lux', 'data-slice01', 'data-slice02'];
const includeCurrentUser = false;
const includeRawData = false;
// END: Script configuration

if (includeCurrentUser && !usernames.includes(xdmp.getCurrentUser())) {
  usernames.push(xdmp.getCurrentUser());
}

function getFieldValues() {
  return cts.fieldValues('nonSemanticKeywords');
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
    fieldValues: xdmp
      .invokeFunction(getFieldValues, { userId: xdmp.user(username) })
      .toArray() /* all values */,
    hasAccessToLastDoc: [],
    noAccessToLastDoc: [],
    connections: xdmp
      .invokeFunction(getConnections, { userId: xdmp.user(username) })
      .toArray()[0], // first value only
  };
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
