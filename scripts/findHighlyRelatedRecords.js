/*
 * Helper script to find docs related to more records than other docs.
 */
'use strict';

// BEGIN: Script configuration
const types = ['Place'];
const startAt = 10000;
const endAt = startAt + 20000;
const returnTopN = 10;
// END: Script configuration

const findings = fn
  .subsequence(
    cts.search(cts.jsonPropertyValueQuery('dataType', types, ['exact'])),
    startAt,
    endAt
  )
  .toArray()
  .map((doc) => {
    const relatedLuxDocs = [];
    doc.toObject().triples.filter((triple) => {
      const relatedUri = triple.triple.object;
      if (relatedUri.startsWith('https://lux.collections.yale.edu/data/')) {
        relatedLuxDocs.push(relatedUri);
      }
    });
    return {
      uri: doc.baseURI,
      triples: relatedLuxDocs.length,
    };
  })
  .sort((a, b) => {
    return b.triples - a.triples;
  })
  .slice(0, returnTopN);

findings;
export default findings;
