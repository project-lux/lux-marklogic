/*
 * Developer script to find content using JSON property criteria.
 *
 * Add more constraints as you see fit, but please make them optional.
 */
'use strict';

// List the item type(s).  Note this can resolve anywhere within the document.
// Consider using classifiedAsId and maybe some new IRI constants?
// May also be an empty array.
const types = ['Person'];

// List the property(ies) that must be somewhere in the content.
// May also be an empty array.
const propNames = [];

// Exact property value match --all must match
// Any property value that is an array will require all of those values (vs. one)
const exactValues = {
  id: [
    'https://lux.collections.yale.edu/data/concept/7a3c5e5b-4bc4-4352-a814-e21ab94951e2',
    'https://lux.collections.yale.edu/data/concept/f3cb46c4-1501-401b-97b2-11fb05baf6ce',
  ],
};

// Pagination params.
const start = 1;
const length = 1;

const queries = [];

if (types.length > 0) {
  queries.push(
    cts.orQuery(
      types.map((type) => {
        return cts.jsonPropertyValueQuery('type', type, 'exact');
      })
    )
  );
}

if (propNames.length > 0) {
  queries.push(
    cts.andQuery(
      propNames.map((propName) => {
        return cts.jsonPropertyScopeQuery(propName, cts.trueQuery());
      })
    )
  );
}

if (exactValues && Object.keys(exactValues).length > 0) {
  queries.push(
    cts.andQuery(
      Object.keys(exactValues).map((key) => {
        if (Array.isArray(exactValues[key])) {
          return exactValues[key].map((value) =>
            cts.jsonPropertyValueQuery(key, value)
          );
        } else {
          return cts.jsonPropertyValueQuery(key, exactValues[key]);
        }
      })
    )
  );
}

fn.subsequence(cts.search(cts.andQuery(queries)), start, length);
//queries;
