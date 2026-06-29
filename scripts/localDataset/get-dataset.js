import {search} from '/lib/searchLib.mjs'
import {getSearchScopes} from '/lib/searchScope.mjs'

/*
 * Get documents for use as a local ML dataset, to be used in QC along with export-collection.js
*/

// Use Equivalent IDs for Units in case URIs change
const unitEquivalentIds = [
  "http://vocab.getty.edu/ulan/500303557", // YCBA
  "http://vocab.getty.edu/ulan/500303563", //Library
  "http://vocab.getty.edu/ulan/500303561", // YPM
  "http://vocab.getty.edu/ulan/500303559", // YUAG
];

// we'll loop through the search scopes later to make sure we're getting related documents of each scope
const scopesToCheck = ['agent', 'concept', 'event', 'item', 'place', 'set', 'work']
const searchScopeInfo = getSearchScopes();

// Can edit this to get more/less triple relationships per document in the list
const numTriples = 10;
const warnings = [];



function getUrisForId(id){
  const q = {identifier: id}
  const searchResults = search({
    searchCriteria: q,
    searchScope: 'agent',
  })
  const orderedItems = searchResults.orderedItems;
  if(orderedItems.length < 1){
    warnings.push(`No matches for id: ${id}`)
  }
  else if(orderedItems.length > 1){
    warnings.push(`Multiple matches for id: ${id}`)
  }
  return orderedItems.map((item) => item.id)
}

function getDataTypesForScope(scope){
  return searchScopeInfo[scope].types
}

function getRelatedTripleSubjects(uri, scope, numResults){
  const dataTypes = getDataTypesForScope(scope);
  return fn.subsequence(
    cts.triples(
        [],
        sem.iri("https://lux.collections.yale.edu/ns/any"),
        sem.iri(uri),
        ['='],
        null,
        cts.jsonPropertyValueQuery('dataType', dataTypes, ['exact'])
      ),
      1,
      numResults
    )
    .toArray()
    .map((triple) => sem.tripleSubject(triple))
}

const relatedDocRegex = new RegExp('https://lux.collections.yale.edu/data/[a-z]+/[0-9a-fA-F-]+', 'g')

function getReferencedDocuments(uri){
  const docJsonString = JSON.stringify(cts.doc(uri).toObject())
  return docJsonString.match(relatedDocRegex) 
}

const docSet = new Set();

const unitUris = unitEquivalentIds.map((id) => getUrisForId(id)).flat()

// loop through units, get their referenced documents, and documents that reference them through triples.
for(const unitUri of unitUris){
  docSet.add(unitUri);
  const referencedDocuments = getReferencedDocuments(unitUri);
  // add referenced documents to docSet
  referencedDocuments.forEach((uri) => docSet.add(uri));
  for(const scope of scopesToCheck){
   const relatedSubjects = getRelatedTripleSubjects(unitUri, scope, numTriples);
   // add subjects to docSet
   relatedSubjects.forEach((subject) => docSet.add(subject))
  }
}

// do it again but with the new set of docs
let docList = Array.from(docSet);
for(const docUri of docList){
  const referencedDocuments = getReferencedDocuments(docUri);
  // add referenced documents to docSet
  referencedDocuments.forEach((uri) => docSet.add(uri));
  for(const scope of scopesToCheck){
   const relatedSubjects = getRelatedTripleSubjects(docUri, scope, numTriples);
   // add subjects to docSet
   relatedSubjects.forEach((subject) => docSet.add(subject))
  }
}

// again
docList = Array.from(docSet);
for(const docUri of docList){
  const referencedDocuments = getReferencedDocuments(docUri);
  // add referenced documents to docSet
  referencedDocuments.forEach((uri) => docSet.add(uri));
  for(const scope of scopesToCheck){
   const relatedSubjects = getRelatedTripleSubjects(docUri, scope, numTriples);
   // add subjects to docSet
   relatedSubjects.forEach((subject) => docSet.add(subject))
  }
}

const result = {docs: Array.from(docSet), warnings}

export default result;