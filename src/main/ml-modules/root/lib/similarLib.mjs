import { processSearchCriteria } from './searchLib.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
  NotFoundError,
} from './mlErrorsLib.mjs';
import {
  ASPECT_NAME_RESERVED,
  SIMILAR_CONFIG,
} from '../config/similarConfig.mjs';
import { STOP_WORDS } from '../data/stopWords.mjs';
import {
  PROP_NAME_BEGIN_OF_THE_BEGIN,
  PROP_NAME_END_OF_THE_END,
  getType,
} from './model.mjs';
import { doesSearchScopeHaveType } from '../lib/searchScope.mjs';
import * as utils from '../utils/utils.mjs';

const NUMBER_OF_TOP_WORDS = 5;
const MIN_WORD_LENGTH = 3;
const LOWER_CHARS_ONLY = /^[a-z]+$/;

function getSimilarQuery(
  searchTerm,
  resolvedSearchOptions,
  searchPatternOptions,
  requestOptions
) {
  const scopeName = searchTerm.getScopeName();
  const similarValues = getSimilarValues(
    scopeName,
    searchTerm.getValue(),
    searchTerm.getProperty('include')
  );
  const searchCriteria = buildSearchCriteria(scopeName, similarValues);
  console.dir(
    { DEBUG_UPDATED_SIMILAR_SEARCH_CRITERIA: searchCriteria },
    { depth: null }
  );
  const searchCriteriaProcessor = processSearchCriteria({
    searchCriteria,
    includeTypeConstraint: false,
    filterResults: requestOptions.filterResults,
  });
  return searchCriteriaProcessor.getCtsQueryStr(false);
}

function getSimilarValues(scopeName, iri, aspects) {
  if (!SIMILAR_CONFIG.hasOwnProperty(scopeName)) {
    throw new InvalidSearchRequestError(
      `'${scopeName}' is not a valid search scope for similar queries`
    );
  }
  const doc = cts.doc(iri);
  if (doc === null) {
    throw new NotFoundError(`Document '${iri}' does not exist`);
  }
  if (!doesSearchScopeHaveType(scopeName, getType(doc))) {
    throw new InvalidSearchRequestError(
      `document '${iri}' is not associated with '${scopeName}' search scope`
    );
  }
  const returnObj = {};
  const scopeConfig = SIMILAR_CONFIG[scopeName];

  // Add the reserved aspect if not present.
  if (utils.isNonEmptyArray(aspects)) {
    if (!aspects.includes(ASPECT_NAME_RESERVED)) {
      aspects.push(ASPECT_NAME_RESERVED);
    }
  } else {
    // Default to all aspects.
    aspects = Object.keys(scopeConfig);
  }

  for (const aspect of aspects) {
    if (!scopeConfig.hasOwnProperty(aspect)) {
      throw new InvalidSearchRequestError(
        `'${aspect}' is not a valid search aspect for the '${scopeName}' search scope. Valid similarity aspects for the '${scopeName}' search scope are: ${Object.keys(
          scopeConfig
        ).join(', ')}.`
      );
    }

    const aspectConfig = scopeConfig[aspect];
    const terms = Object.keys(aspectConfig).sort();
    for (const term of terms) {
      let values = [];
      const termConfig = aspectConfig[term];
      const ignore = termConfig.ignore || [];
      for (const path of termConfig.paths) {
        if (termConfig.date === true) {
          values.push(...getDateRanges(doc, path));
        } else {
          values.push(...getOtherValues(doc, path));
          if (term === 'text') {
            // add a person's name to the ignored words
            if (scopeName === 'agent') {
              const type = doc
                .xpath(
                  "/indexedProperties[dataType=('Person', 'Group')]/dataType"
                )
                .toArray()[0]
                .valueOf();
              if (type === 'Person') {
                const primaryNames = doc
                  .xpath(
                    "/json[type = ('Group', 'Person')]/identified_by[./classified_as/equivalent/id='http://vocab.getty.edu/aat/300404670']/content"
                  )
                  .toArray();
                primaryNames.forEach((primaryName) => {
                  const tokens = primaryName
                    .valueOf()
                    .toLowerCase()
                    .split(/[\s.,\-]/);
                  tokens.forEach((token) => {
                    ignore.push(token);
                  });
                });
              }
            }
            values = getTopWords(values, ignore);
          } else {
            values = removeIgnoredValues(values, ignore);
          }
        }
      }

      returnObj[term] = {
        values: values,
        child: termConfig.child,
        weight: termConfig.weight,
        mandatory: termConfig.mandatory,
        searchBuilderFunc: termConfig.searchBuilderFunc,
      };
    }
  }
  return returnObj;
}

function buildSearchCriteria(scope, similarValues) {
  const OR = []; // All optional criteria goes herein.
  const AND = [{ OR: OR }]; // All required criteria goes herein, along with the optional.
  const combinedCriteria = {
    _scope: scope,
    AND: AND,
  };

  let criteriaCnt = 0;
  const similarValuesEntries = Object.entries(similarValues);
  for (const [
    searchTerm,
    { values, child, weight, mandatory, searchBuilderFunc },
  ] of similarValuesEntries) {
    for (const value of values) {
      if (value) {
        const searchObj = searchBuilderFunc(searchTerm, child, weight, value);
        if (mandatory === true) {
          AND.push(searchObj);
        } else {
          OR.push(searchObj);
        }
        criteriaCnt++;
      }
    }
  }
  if (criteriaCnt === 0) {
    throw new InvalidSearchRequestError(
      `the similar query cannot extract any search criteria with the given aspects. Please select more aspects. If all aspects are selected, there is not enough information in this record to search for similar ones.`
    );
  }
  return combinedCriteria;
}

function getDateRanges(doc, path) {
  let timeSpanPath = null;
  if (path.endsWith(`/${PROP_NAME_BEGIN_OF_THE_BEGIN}`)) {
    timeSpanPath = path.substring(
      0,
      path.length - PROP_NAME_BEGIN_OF_THE_BEGIN.length - 1
    );
  } else if (path.endsWith(`/${PROP_NAME_END_OF_THE_END}`)) {
    timeSpanPath = path.substring(
      0,
      path.length - PROP_NAME_END_OF_THE_END.length - 1
    );
  } else {
    throw new InternalServerError(
      'A term configured to dates is not configured to the beginning or ending of a date range.'
    );
  }

  // For each time span node, return a value in the form of '[startDate];[endDate]'.
  const dateRanges = [];
  doc
    .xpath(timeSpanPath)
    .toArray()
    .forEach((timeSpanNode) => {
      const defaultValue = '';
      const startDateStr = getFirstValue(
        timeSpanNode,
        './' + PROP_NAME_BEGIN_OF_THE_BEGIN,
        defaultValue
      );
      const endDateStr = getFirstValue(
        timeSpanNode,
        './' + PROP_NAME_END_OF_THE_END,
        defaultValue
      );
      if (
        utils.isNonEmptyString(startDateStr) ||
        utils.isNonEmptyString(endDateStr)
      ) {
        dateRanges.push(`${startDateStr};${endDateStr}`);
      }
    });
  return dateRanges;
}

function getOtherValues(doc, path) {
  return (
    doc
      .xpath(path)
      // xpath returns a Sequence (https://docs.marklogic.com/js/Sequence) of values, we need to convert to an array
      .toArray()
      // the values returned are Nodes (https://docs.marklogic.com/js/Node), we need to get the primitive value from the Node
      .map((value) => value.valueOf())
  );
}

function getFirstValue(node, path, defaultValue = null) {
  // See getNonDateValues for why toArray and valueOf are used.
  const nodes = node.xpath(path).toArray();
  return nodes.length > 0 ? nodes[0].valueOf() : defaultValue;
}

function removeIgnoredValues(values, valuesToIgnore) {
  const ignoreSet = new Set(valuesToIgnore);
  return values.filter((value) => !ignoreSet.has(value));
}

function getTopWords(phrases, wordsToIgnore) {
  const wordCountMap = getWordCountMap(phrases);
  // each entry is a 2 element array: [word(string), count(number)]
  const wordCountEntries = Array.from(wordCountMap.entries());
  wordCountEntries.sort((a, b) => b[1] - a[1]);
  const wordsToReturn = wordCountEntries
    .slice(0, NUMBER_OF_TOP_WORDS)
    .map((wordCountEntry) => wordCountEntry[0]);
  return wordsToReturn;

  // Counts word occurrences given a list of phrases
  function getWordCountMap(phrases) {
    const wordCountMap = new Map();
    const ignoreSet = new Set(wordsToIgnore);
    for (const phrase of phrases) {
      const tokens = phrase.toLowerCase().split(/[\s.,\-]/);
      for (const token of tokens) {
        if (isWord(token) && !ignoreSet.has(token) && !STOP_WORDS.has(token)) {
          incrementWordCounts(token);
        }
      }
    }
    return wordCountMap;

    function incrementWordCounts(word) {
      if (wordCountMap.has(word)) {
        wordCountMap.set(word, wordCountMap.get(word) + 1);
      } else {
        wordCountMap.set(word, 1);
      }
    }
    function isWord(token) {
      return token.length > MIN_WORD_LENGTH && LOWER_CHARS_ONLY.test(token);
    }
  }
}

export { getSimilarQuery };
