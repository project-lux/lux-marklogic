import * as utils from '../utils/utils.mjs';
import {
  getConfigurationByContext,
  getContextParameterValues,
} from '../config/autoCompleteConfig.mjs';
import { sanitizeAndValidateWildcardedStrings } from './searchLib.mjs';
import { BadRequestError } from './mlErrorsLib.mjs';

const MAXIMUM_RESULT_COUNT = 10;

function getMatches(
  text,
  context = '',
  fullyHonorContext = true,
  onlyMatchOnPrimaryNames = true,
  onlyReturnPrimaryNames = false,
  page = 1,
  pageLength = MAXIMUM_RESULT_COUNT,
  filterIndex = 0,
  previouslyFiltered = 0,
  timeoutInMilliseconds = 0
) {
  const start = new Date();

  utils.checkPaginationParameters(page, pageLength);
  pageLength = Math.min(pageLength, MAXIMUM_RESULT_COUNT);

  // Use the context parameter value to identify the specific auto complete configuration to use.
  const autoCompleteConfig = getConfigurationByContext(context);
  if (!autoCompleteConfig) {
    throw new BadRequestError(
      `The '${context}' context does not identify an auto complete configuration; accepted values: ${getContextParameterValues()
        .sort()
        .join(', ')}.`
    );
  }
  const fieldForNamesToReturn = autoCompleteConfig.namesIndexReference;
  if (!fieldForNamesToReturn || fieldForNamesToReturn == 'null') {
    throw new BadRequestError(
      `The auto complete name index is not specified for the '${context}' search tag.`
    );
  }
  // See if we're to match on the field that also includes alternative names.
  let fieldForMatchingNames = fieldForNamesToReturn;
  if (!onlyMatchOnPrimaryNames && fieldForNamesToReturn.includes('Primary')) {
    // Presumes a naming convention and that the derived field has a range index.
    fieldForMatchingNames = fieldForNamesToReturn.replace('Primary', '');
  }
  // TODO: should we pull this from SEARCH_TERM_CONFIG and at that point, merge all of auto complete's configuration therein?
  const fieldForId = autoCompleteConfig.idsIndexReferences;

  const matchOn = sanitizeAndValidateWildcardedStrings(text + '*');
  const params = {
    matchOn,
    onlyMatchOnPrimaryNames,
    onlyReturnPrimaryNames,
    fieldForNamesToReturn,
    fieldForMatchingNames,
    fieldForId,
    page,
    pageLength,
    filterIndex,
    previouslyFiltered,
    start,
    timeoutInMilliseconds,
  };

  const response = fullyHonorContext
    ? _fullyHonorContext(params)
    : _partiallyHonorContext(params);
  delete params.start;
  response.metadata = {
    milliseconds: new Date() - start,
    returned: response.matches.length,
    fullyHonorContext,
    ...params,
    ...response.metadata,
  };
  return response;
}

// Slower route but a) does not include false positives and b) includes each primary name's URI.
function _fullyHonorContext({
  matchOn,
  onlyReturnPrimaryNames,
  fieldForNamesToReturn,
  fieldForMatchingNames,
  fieldForId,
  page,
  pageLength,
  filterIndex,
  previouslyFiltered,
  start,
  timeoutInMilliseconds,
}) {
  let timedOut = false;

  let startingLoc =
    filterIndex > 0
      ? filterIndex
      : utils.getStartingPaginationIndexForSubsequence(page, pageLength);
  let batchSize = getInitialBatchSize(
    pageLength,
    fieldForNamesToReturn,
    fieldForMatchingNames,
    previouslyFiltered,
    timeoutInMilliseconds
  );

  let filteredCount = 0;
  const timeoutFrequencyCheck = 1; // check is quick enough, right?
  const matches = [];
  while (!timedOut && matches.length < pageLength) {
    // Get a batch of candidate names
    const candidateUris = _getUrisOfMatches(
      matchOn,
      fieldForMatchingNames,
      startingLoc,
      batchSize
    );
    if (candidateUris.length == 0) {
      break;
    }

    for (let i = 0; i < candidateUris.length; i++) {
      filteredCount++;

      // cts.fieldValueQuery proved to be faster than cts.fieldValueMatch here.
      // cts.fieldValueMatch was imposing a 70 to 80 millisecond penalty on the first call to it
      // per request.  By switching to cts.fieldValueQuery, we can check about that many more
      // candidates before timing out.
      //
      // NOTE: The following will not work with datasets whereby the URIs do not match the IDs.
      // To get it to work with the months-old small dataset, one would have to add
      // 'https://lux.collections.yale.edu/data/' to the beginning of the candidate URI.
      if (
        fn.head(
          cts.search(
            cts.fieldValueQuery(fieldForId, candidateUris[i], ['exact']),
            ['score-zero', 'unchecked', 'unfaceted']
          )
        )
      ) {
        matches.push(
          _constructMatch(
            candidateUris[i],
            fieldForNamesToReturn,
            onlyReturnPrimaryNames,
            matchOn,
            fieldForMatchingNames
          )
        );
        if (matches.length == pageLength) {
          break;
        }
      }

      if (
        timeoutInMilliseconds > 0 &&
        filteredCount % timeoutFrequencyCheck === 0
      ) {
        if (new Date() - start >= timeoutInMilliseconds) {
          timedOut = true;
          break;
        }
      }
    }

    startingLoc += batchSize;
    if (matches.length > 0) {
      batchSize = getSubsequentBatchSize(
        pageLength,
        fieldForNamesToReturn,
        fieldForMatchingNames,
        previouslyFiltered,
        timeoutInMilliseconds,
        matches.length,
        filteredCount
      );
    }
  }

  return {
    matches,
    metadata: {
      timedOut,
      filterIndex: filterIndex + filteredCount,
      filteredCount,
    },
  };
}

function getInitialBatchSize(
  pageLength,
  fieldForNamesToReturn,
  fieldForMatchingNames,
  previouslyFiltered,
  timeoutInMilliseconds
) {
  if (previouslyFiltered > 0) {
    // 10% more than last time
    return Math.ceil(previouslyFiltered * 1.1);
  }
  const base = timeoutInMilliseconds > 0 ? timeoutInMilliseconds : pageLength;
  const multiplier = fieldForNamesToReturn != fieldForMatchingNames ? 1.5 : 1.2;
  return Math.min(500, Math.ceil(base * multiplier));
}

// TODO: factor in time remaining and number of qualified matches so as not to waste time asking for
// more candidates than there is time or need to filter.  May also want to know how long it has been
// taking to get a batch of x candidates.
function getSubsequentBatchSize(
  pageLength,
  fieldForNamesToReturn,
  fieldForMatchingNames,
  previouslyFiltered,
  timeoutInMilliseconds,
  matchesLength,
  filteredCount
) {
  return Math.max(
    pageLength, // low end.
    Math.min(
      getInitialBatchSize(
        pageLength,
        fieldForNamesToReturn,
        fieldForMatchingNames,
        previouslyFiltered,
        timeoutInMilliseconds
      ),
      Math.ceil((filteredCount / matchesLength) * (pageLength - matchesLength))
    )
  );
}

// Faster route but includes false positives.
function _partiallyHonorContext({
  matchOn,
  fieldForNamesToReturn,
  fieldForMatchingNames,
  page,
  pageLength,
}) {
  return {
    matches: _getUrisOfMatches(
      matchOn,
      fieldForMatchingNames,
      utils.getStartingPaginationIndexForSubsequence(page, pageLength),
      pageLength
    ).map((uri) => {
      return _constructMatch(uri, fieldForNamesToReturn);
    }),
  };
}

function _constructMatch(
  uri,
  fieldForNamesToReturn,
  onlyReturnPrimaryNames = true,
  matchOn = null,
  fieldForMatchingNames = null
) {
  // Able to include primary names that do not match the consumer-provided text.
  // If we were to switch to cts.fieldValueMatch, we may take a 70-80 millisecond
  // penalty on the first call to it per request, as observed in directly within
  // _fullyHonorContext, which is when we switched to cts.fieldValueQuery.  But,
  // we'd already be doing so when onlyReturnPrimaryNames=false so perhaps we
  // should always use it at this point or at least when onlyReturnPrimaryNames
  // is false.
  const match = {
    uri,
    primaryNames: cts
      .fieldValues(
        fieldForNamesToReturn,
        null,
        ['ascending', 'document', 'score-zero', 'unchecked'],
        cts.documentQuery(uri)
      )
      .toArray(),
  };
  if (!onlyReturnPrimaryNames) {
    // Discrepancies are possible between candidates served up by _getUrisOfMatches and the following
    // call to cts.fieldValueMatch.
    //
    // 1. _getUrisOfMatches() uses cts.search's 'unfiltered' option; see _getUrisOfMatches for a detailed explanation.
    //
    // 2. _getUrisOfMatches() uses cts.fieldValueQuery, which supports more options than cts.fieldValueMatch; for example
    //    cts.fieldValueMatch is always punctuation sensitive.
    //
    // See _fullyHonorContext's note on cts.fieldValueMatch regarding a potential once-per-request performance penalty.
    //
    match.matchingNames = cts
      .fieldValueMatch(
        fieldForMatchingNames,
        matchOn,
        ['ascending', 'case-insensitive', 'diacritic-insensitive', 'document'],
        cts.documentQuery(uri)
      )
      .toArray();
  }
  return match;
}

function _getUrisOfMatches(
  matchOn,
  fieldForMatchingNames,
  startingLoc,
  length
) {
  // Including cts.search's unfiltered option, as we are below, can indeed include false positives.  For
  // example, 'ben*' can get you results that included 'ben' anywhere in the name, versus starting with it.
  // But, filtering takes so long that it would not be practical in an auto complete context, at least
  // give the size of LUX's dataset.  Could consider filtering herein or elsewhere in this library; if we
  // do, we'll only want to pull primary and matching names once --presently this is already done in
  // _constructMatch.  The fullyHonorContext=true flow calls _constructMatch after the ID check.  ID
  // check may be fast enough that it would be best to check the name match afterwards.
  return fn
    .subsequence(
      cts.search(
        cts.fieldValueQuery(fieldForMatchingNames, matchOn, [
          'case-insensitive',
          'diacritic-insensitive',
          'punctuation-insensitive',
          'whitespace-insensitive',
          'stemmed',
          'wildcarded',
        ]),
        ['score-zero', 'unchecked', 'unfaceted', 'unfiltered']
      ),
      startingLoc,
      length
    )
    .toArray()
    .map((doc) => {
      return fn.baseUri(doc);
    });
}

export { getMatches };
