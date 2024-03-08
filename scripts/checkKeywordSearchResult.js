/*
 * For each keyword of a keyword search, this script may be used to determine whether the
 * keyword was resolved in the specified search result document and/or one of its related
 * documents.  The script checks each keyword individually, and thus can be used for AND'd
 * and OR'd keyword searches.
 *
 * This script may be used to draw out false positive Optic API search results.  Optic API
 * searches are unfiltered.  LUX's CTS searches are filtered^.  This script also uses
 * filtered CTS searches.  As such, when the Optic API returns a search result that CTS does
 * not, the most suspect explanation may be a false positive from the Optic API; however,
 * there are at least two additional explanations: a false *negative* from CTS Search or a
 * bug in this script.  A manual review of the data may be required for a definite answer.
 *
 * Usage: update the variable values within the script configuration section, then run.
 *
 * If you find related documents (identified by object URIs) that contain a keyword yet
 * this script reports it does not, check to see if the record type is included in the
 * object field, which is likely the referencePrimaryName field.  At least into Feb 2024,
 * that field's record types were limited to Activity, Group, Language, MeasurementUnit,
 * Period, Person, Place, and Type.
 *
 * ^ There are unfiltered aspects to CTS Search.  We have a script that targets CTS Search
 *   false positives: determineFalsePositiveCount.js.
 */
'use strict';

import { FULL_TEXT_SEARCH_RELATED_FIELD_NAME } from '/lib/appConstants.mjs';
import { getSearchScope } from '/lib/searchScope.mjs';

// START: script configuration.
const subjectUri =
  'https://lux.collections.yale.edu/data/person/098de228-41f2-404e-83e2-e48b2bd632f8';
const keywords = ['franklin', 'boston', 'naval academy'].sort();
const scopeName = 'agent';
const maxObjectsToCheck = 100;
// END: script configuration.

const scope = getSearchScope(scopeName);
// Limited to single predicate support; yet, all search scopes only have one predicate
// (and all are in the LUX namespace).
const predicate = xdmp
  .eval(
    `
  const op = require('/MarkLogic/optic');
  const lux = op.prefixer('https://lux.collections.yale.edu/ns/');
  ${scope.predicates[0]}.toString();
`
  )
  .toArray()[0];
const subjectFieldName = scope.fields[0]; // easy to support multiple, but all scopes only use one.
const objectFieldName = FULL_TEXT_SEARCH_RELATED_FIELD_NAME;

const searchOptions = ['unfaceted'];
const fieldWordQueryOptions = [
  'case-insensitive',
  'diacritic-insensitive',
  'punctuation-insensitive',
  'whitespace-sensitive',
  'stemmed',
  'wildcarded',
];

const findings = {
  parameters: {
    subjectUri,
    scopeName,
    keywords,
    maxObjectsToCheck,
  },
  configuration: {
    predicate,
    subjectFieldName,
    objectFieldName,
  },
  subject: {
    matchedAll: false,
    matches: {},
  },
  objects: {
    objectsNotSearched: 0,
    matchedAll: [],
    matches: {},
    uris: [],
  },
};

// Check subject doc.
let keywordsMatchCount = 0;
for (let keyword of keywords) {
  const q = cts.andQuery([
    cts.documentQuery(subjectUri),
    cts.fieldWordQuery(subjectFieldName, keyword, fieldWordQueryOptions),
  ]);
  if (fn.subsequence(cts.search(q, searchOptions), 1, 1).toArray().length > 0) {
    findings.subject.matches[keyword] = true;
    keywordsMatchCount++;
  } else {
    findings.subject.matches[keyword] = false;
  }
}
if (keywordsMatchCount == keywords.length) {
  findings.subject.matchedAll = true;
}

// Get all of the object IRIs matching the above-specified predicate which are also URIs in the database.
let objectUris = [];
for (let item of cts.doc(subjectUri).toObject().triples) {
  if (
    item.triple.predicate == predicate &&
    fn.docAvailable(item.triple.object)
  ) {
    objectUris.push(item.triple.object);
  }
}
// May want to de-dup if script is extended to support multiple predicates.
objectUris = objectUris.filter(function (item, pos) {
  return objectUris.indexOf(item) == pos;
});
if (objectUris.length > maxObjectsToCheck) {
  findings.objects.objectsNotSearched = objectsUris.length - maxObjectsToCheck;
  objectUris.slice(0, maxObjectsToCheck);
}
findings.objects.uris = objectUris;

// One-time prep for objects.
for (let keyword of keywords) {
  if (!findings.objects.matches[keyword]) {
    findings.objects.matches[keyword] = [];
  }
}

// Check object docs.
for (let objectUri of objectUris) {
  let keywordsMatchCount = 0;
  for (let keyword of keywords) {
    const q = cts.andQuery([
      cts.documentQuery(objectUri),
      cts.fieldWordQuery(objectFieldName, keyword, fieldWordQueryOptions),
    ]);
    if (
      fn.subsequence(cts.search(q, searchOptions), 1, 1).toArray().length > 0
    ) {
      findings.objects.matches[keyword].push(objectUri);
      keywordsMatchCount++;
    }
  }
  if (keywordsMatchCount == keywords.length) {
    findings.objects.matchedAll.push(objectUri);
  }
}

findings;
