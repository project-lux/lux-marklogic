// This script may be used to convert search criteria into a CTS query,
// formatted as a string or object.  The script is also capable of returning
// the entire call to cts.search.  One may provide additional values into
// the call to processSearchCriteria.  Lastly, by modifying the bottom of the
// script, one may return anything available to the instance of
// SearchCriteriaProcessor.  Enjoy!
'use strict';
import { processSearchCriteria } from '/lib/searchLib.mjs';
import { START_OF_GENERATED_QUERY } from '/lib/SearchCriteriaProcessor.mjs';

// formatAsObject: when true and includeCtsSearch is false, get the CTS query
// as a JavaScript object; else, the CTS query is a string.
const formatAsObject = true;
//
// includeCtsSearch: when true, return the entire call to cts.search.  Takes
// precedence over formatAsObject.
const includeCtsSearch = false;
//
// filterResults: set to true for filtered results or false for unfiltered.
const filterResults = false;
//
// searchCriteria: the search criteria to convert.  Both search grammars are
// supported.
const searchCriteria = {
  _scope: 'item',
  AND: [
    {
      producedDate: 1940,
      _comp: '>',
    },
    {
      producedDate: 1950,
      _comp: '<',
    },
  ],
};
//
// searchScope: required by the string search grammar and when not specified
// by the _scope property in the JSON search grammar.
const searchScope = null;

/*
  Additional values may be provided to processSearchCriteria.  Below is a 
  potentially data list of properties and default values.  Note that this
  function accepts more than the search endpoint.  See the current impl.
  of processSearchCriteria for updated properties and defaults.

  searchCriteria = null,
  searchScope = null,
  searchPatternOptions = null,
  includeTypeConstraint = DEFAULT_INCLUDE_TYPE_CONSTRAINT (true),
  page = DEFAULT_PAGE (1),
  pageLength = DEFAULT_PAGE_LENGTH (20),
  sortCriteria = new SortCriteria(""),
  synonymsEnabled = DEFAULT_SYNONYMS_ENABLED (false),
  facetsAreLikely = DEFAULT_FACETS_ARE_LIKELY (false),
  stopWatch = new StopWatch(true),
  valuesOnly = DEFAULT_VALUES_ONLY (false),
 */
const searchCriteriaProcessor = processSearchCriteria({
  searchCriteria,
  searchScope,
  filterResults,
});

// Rather than returning the CTS Query, one may also elect to return other or
// additional information from the SearchCriteriaProcessor instance.  See that
// class's implementation for available functions.
const ctsQueryStr = searchCriteriaProcessor.getCtsQueryStr(includeCtsSearch);
const requestedQuery =
  !includeCtsSearch && formatAsObject
    ? xdmp
        .eval(START_OF_GENERATED_QUERY.concat(ctsQueryStr))
        .toArray()[0]
        .toObject()
    : ctsQueryStr;
requestedQuery;
