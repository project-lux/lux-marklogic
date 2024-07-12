// Find out which users can see which triples and documents, restricted by a single predicate and
// maximum number of hops.  Created while vetting the LUX Data Slice design with a small amount
// of data; may be used on larger datasets but with reasonable values for the max* variables.
//
// Assumptions/prerequisites/limitations/notes:
//
//   1. URIs are the same as IRIs.
//   2. Limited to a single predicate but can modified to support multiple.
//
'use strict';

const op = require('/MarkLogic/optic');
const crm = op.prefixer('http://www.cidoc-crm.org/cidoc-crm/');
const la = op.prefixer('https://linked.art/ns/terms/');
const lux = op.prefixer('https://lux.collections.yale.edu/ns/');
const skos = op.prefixer('http://www.w3.org/2004/02/skos/core#');

// START: Script configuration
const predicate = skos('broader');
const maxHops = 2;
const maxTriplesPerHop = 10;
const fieldName = 'placePrimaryName';
const maxFieldValues = 10;
const usernames = ['lux-by-unit-endpoint-consumer', 'ypm-endpoint-consumer'];
const includeCurrentUser = false;
const includeRawData = false;
// END: Script configuration

if (includeCurrentUser && !usernames.includes(xdmp.getCurrentUser())) {
  usernames.push(xdmp.getCurrentUser());
}

function getFieldValues() {
  return fn.subsequence(cts.fieldValues(fieldName), 1, maxFieldValues);
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
  const triples = fn
    .subsequence(
      cts.triples([], sem.iri(predicate), [], [], [], ctsQuery),
      1,
      maxTriplesPerHop
    )
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
