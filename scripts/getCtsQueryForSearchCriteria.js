// Use this function to get a CTS query for search criteria, without having to pull and format
// from the logs.  All information available to a SearchCriteriaProcessor instance is available.
'use strict';
import { processSearchCriteria } from '/lib/searchLib.mjs';

// formatAsObject: when true and includeCtsSearch is false, get the CTS query
// as a JavaScript object; else, the CTS query is a string.
const formatAsObject = true;
// includeCtsSearch: when true, return the entire call to cts.search.  Takes
// precedence over formatAsObject.
const includeCtsSearch = false;
// Provide the search criteria here.  Both search grammars are supported.
const searchCriteria = {
  _scope: 'item',
  AND: [
    {
      producedDate: 2023,
      _comp: '>',
    },
    {
      producedDate: 2023,
      _comp: '<',
    },
  ],
};

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
});

// Rather than returning the CTS Query, one may also elect to return other or
// additional information from the SearchCriteriaProcessor instance.  See that
// class's implementation for available functions.
const ctsQueryStr = searchCriteriaProcessor.getCtsQueryStr(includeCtsSearch);
const requestedQuery =
  !includeCtsSearch && formatAsObject
    ? xdmp.eval(ctsQueryStr).toArray()[0].toObject()
    : ctsQueryStr;
requestedQuery;
