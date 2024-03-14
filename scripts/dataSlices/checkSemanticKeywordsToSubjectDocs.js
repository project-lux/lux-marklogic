// This script may be used to go from a semantic keyword found in a related document to get to the
// search result documents.  An important distinction for this script is that it works starting
// from the object / related documents as opposed to the subject / search result documents.
//
// To use, update variable values in the script configuration section and run.  Use the
// returnSubjectsToObjects variable to either return this script's main output (set to true) or
// the objects-to-subjects intermediary information (set to false).
//
// Depending on the data and keyword, there may be greater or fewer subject / search result docs
// than qualifying object / related docs.
//
// Executes as current user, as opposed to being able to specify the user.  As such, it is possible
// for this script to return subjects that search will not due to the user not having read
// permission to the document containing the semantic keyword.
'use strict';
const op = require('/MarkLogic/optic');
const lux = op.prefixer('https://lux.collections.yale.edu/ns/');

// START: Script configuration
const semanticKeyword = 'sSlice02';
const returnSubjectsToObjects = true;
// END: Script configuration

const docs = cts
  .search(cts.fieldWordQuery('semanticKeywords', semanticKeyword))
  .toArray();
const objectIds = docs.map((doc) => {
  return doc.xpath('/id') + '';
});

const objectsToSubjects = {};
objectIds.forEach((objectId) => {
  const triples = cts
    .triples([], lux('isRelatedTo'), sem.iri(objectId))
    .toArray();
  if (triples.length > 0) {
    objectsToSubjects[objectId] = [];
    triples.forEach((triple) => {
      objectsToSubjects[objectId].push(triple.toObject().triple.subject);
    });
  }
});

const subjectsToObjects = [];
const getSubjectToObjectEntry = (subjectId) => {
  const entries = subjectsToObjects.filter((entry) => {
    return entry.subjectId == subjectId;
  });
  if (entries.length > 0) {
    console.log('Found entry for ' + subjectId);
    return entries[0];
  } else {
    console.log('Creating entry for ' + subjectId);
    subjectsToObjects.push({
      subjectId,
      docAvailable: fn.docAvailable(subjectId),
      objectIds: [],
    });
    return getSubjectToObjectEntry(subjectId);
  }
};

Object.keys(objectsToSubjects).forEach((objectId) => {
  objectsToSubjects[objectId].forEach((subjectId, idx) => {
    getSubjectToObjectEntry(subjectId).objectIds.push(objectId);
  });
});

returnSubjectsToObjects ? subjectsToObjects : objectsToSubjects;
