/*
 * Get a facet's values restricted by search criteria.  Search criteria may be specified as
 * a CTS object or string.  Could extend to also support both search grammars.
 *
 * In order to specify the search criteria as a CTS query, this script includes code copied
 * from facetsLib.mjs.  Thus, if that code changes, this copy may need to be updated.
 *
 * To use, edit variables in the script's configuration section then execute.
 */
'use strict';
import { FACETS_CONFIG } from '/config/facetsConfig.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';

const op = require('/MarkLogic/optic');
const crm = op.prefixer('http://www.cidoc-crm.org/cidoc-crm/');
const la = op.prefixer('https://linked.art/ns/terms/');
const lux = op.prefixer('https://lux.collections.yale.edu/ns/');
const skos = op.prefixer('http://www.w3.org/2004/02/skos/core#');

// START: Configuration
const facetName = 'itemIsOnline';
const ctsQueryIsObject = true; // Set to false when starting with a string.
const ctsQuery = cts.orQuery([
  cts.fieldWordQuery(
    ['itemAnyText'],
    ['fossil', 'bed', 'national', 'monument', 'study'],
    [
      'case-insensitive',
      'diacritic-insensitive',
      'punctuation-insensitive',
      'whitespace-insensitive',
      'stemmed',
      'wildcarded',
    ],
    1
  ),
  cts.tripleRangeQuery(
    [],
    [[lux('itemAny')]],
    fn.insertBefore(
      cts.values(
        cts.iriReference(),
        '',
        ['eager', 'concurrent'],
        cts.fieldWordQuery(
          ['referencePrimaryName'],
          ['fossil', 'bed', 'national', 'monument', 'study'],
          [
            'case-insensitive',
            'diacritic-insensitive',
            'punctuation-insensitive',
            'whitespace-insensitive',
            'stemmed',
            'wildcarded',
          ],
          1
        )
      ),
      0,
      sem.iri('/does/not/exist')
    ),
    '=',
    [],
    1
  ),
]);
// END: Configuration

const getFacetValues = (facetName, ctsQuery, ctsQueryIsObject) => {
  const fieldValuesOptions = ['frequency-order', 'eager'];

  ctsQuery = ctsQueryIsObject
    ? ctsQuery
    : SearchCriteriaProcessor.evalQueryString(ctsQuery);

  return Array.from(
    cts.fieldValues(
      FACETS_CONFIG[facetName].indexReference,
      null,
      fieldValuesOptions,
      ctsQuery
    )
  ).map((value) => ({
    value: value,
    count: cts.frequency(value),
  }));
};

getFacetValues(facetName, ctsQuery, ctsQueryIsObject);
