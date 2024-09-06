const op = require('/MarkLogic/optic');
import { convertPartialDateTimeToSeconds } from './dateUtils.mjs';
import { BadRequestError, NotImplementedError } from '../lib/mlErrorsLib.mjs';
import {
  FACETS_PREFIX,
  IRI_PREFIX,
  RELATED_LIST_PREFIX,
  SEARCH_PREFIX,
  SEARCH_ESTIMATE_PREFIX,
  RELATED_LIST_PAGE_LENGTH_DEFAULT,
  RELATED_LIST_PER_RELATION_DEFAULT,
} from '../lib/appConstants.mjs';

// When the request is already associated to an ID of the specified type, return it;
// else, associate and return a new ID.  The intent here is not to change the request
// ID when, for example, a Via Search Facet is requested through the search endpoint.
function assignRequestId(requestType) {
  // Protect from exception given this can be called outside a library's try/catch and
  // not being able to get an ID should not be grounds to interrupt the request.
  try {
    const key = `${requestType}RequestId`;
    let requestId = xdmp.requestLogGet(key);
    if (fn.empty(requestId)) {
      requestId = xdmp.random();
      xdmp.requestLogPut(key, requestId);
    }
    return requestId;
  } catch (e) {
    return xdmp.random();
  }
}

function areArraysEqual(arr1, arr2, maySort = true) {
  if (
    Array.isArray(arr1) &&
    Array.isArray(arr2) &&
    arr1.length === arr2.length
  ) {
    if (maySort === true) {
      arr1.sort();
      arr2.sort();
    }
    return arr1.every(function (element, index) {
      return element == arr2[index];
    });
  }
  return false;
}

// Returns items in arr1 not in arr2.
// Reverse args in a second call to also find out what arr2 has that arr1 doesn't.
function getArrayDiff(arr1, arr2) {
  return arr1.filter((x) => !arr2.includes(x));
}

function getArrayOverlap(arr1, arr2) {
  // This common solution from the internet can return all of arr1 despite arr2 not having some of arr1's items.
  // return arr1.filter((x) => arr2.includes(x));

  // Credit to https://stackoverflow.com/questions/12433604/how-can-i-find-matching-values-in-two-arrays#answer-12437683
  var sortedArr1 = arr1.concat().sort();
  var sortedArr2 = arr2.concat().sort();
  var overlapArr = [];
  var idx1 = 0;
  var idx2 = 0;

  while (idx1 < arr1.length && idx2 < arr2.length) {
    if (sortedArr1[idx1] === sortedArr2[idx2]) {
      overlapArr.push(sortedArr1[idx1]);
      idx1++;
      idx2++;
    } else if (sortedArr1[idx1] < sortedArr2[idx2]) {
      idx1++;
    } else {
      idx2++;
    }
  }
  return overlapArr;
}

function getMergedArrays(arr1, arr2, maySort = true) {
  let mergedArr = arr2.concat(getArrayDiff(arr1, arr2));
  if (maySort === true) {
    mergedArr.sort();
  }
  return mergedArr;
}

// Convert an array to a string, for subsequent evaluation.
function arrayToString(arr, scalarType = 'string') {
  const quoteChar = scalarType == 'string' ? '"' : '';
  return `[${toArray(arr)
    .map((val) => `${quoteChar}${escapeCharacters(val, quoteChar)}${quoteChar}`)
    .join(', ')}]`;
}

function checkPaginationParameters(page, pageLength) {
  if (
    !Number.isFinite(page) ||
    page <= 0 ||
    !Number.isFinite(pageLength) ||
    pageLength <= 0
  ) {
    throw new BadRequestError(
      `Invalid pagination parameter values. Both must be greater than zero. Given '${page}' for page and '${pageLength}' for pageLength.`
    );
  }
}

function evalInContentDatabase(javascript, vars = {}, update = false) {
  return xdmp.eval(javascript, vars, {
    database: xdmp.database(),
    update: update + '',
  });
}

function evalInModulesDatabase(javascript, vars = {}, update = false) {
  return xdmp.eval(javascript, vars, {
    database: xdmp.modulesDatabase(),
    update: update + '',
  });
}

function getDocFromModulesDatabase(uri) {
  return fn.head(
    evalInModulesDatabase('const { uri } = external; cts.doc(uri)', { uri })
  );
}

function getObjectFromJson(doc) {
  if (doc && doc.toObject) {
    doc = doc.toObject();
  }
  return doc;
}

function _getUnadjustedStartingSearchResultIndex(page, pageLength) {
  return (page - 1) * pageLength;
}

function getStartingPaginationIndexForOffset(page, pageLength) {
  // Offset is zero-based.
  return _getUnadjustedStartingSearchResultIndex(page, pageLength) + 0;
}

function getStartingPaginationIndexForSplice(page, pageLength) {
  // Splice is also zero-based like offset.
  return getStartingPaginationIndexForOffset(page, pageLength);
}

function getStartingPaginationIndexForSubsequence(page, pageLength) {
  // Subsequence is one-based.
  return _getUnadjustedStartingSearchResultIndex(page, pageLength) + 1;
}

function isObject(obj) {
  return typeof obj === 'object' && !Array.isArray(obj) && obj !== null;
}

function isArray(arr) {
  return arr != null && Array.isArray(arr);
}

function isNonEmptyArray(arr) {
  return isArray(arr) && arr.length > 0;
}

function isString(str) {
  return typeof str == 'string';
}

function isNonEmptyString(str, trim = false) {
  if (isString(str)) {
    if (trim === true) {
      str = str.trim();
    }
    return str.length > 0;
  }
  return false;
}

function removeItemByIndexFromArray(arr, indexToDelete) {
  if (
    isNonEmptyArray(arr) &&
    indexToDelete > -1 &&
    indexToDelete < arr.length
  ) {
    return arr.filter((item, idx) => {
      return idx != indexToDelete;
    });
  }
  return arr;
}

function removeItemByValueFromArray(arr, valueToDelete) {
  if (isNonEmptyArray(arr)) {
    return arr.filter((item) => {
      return item != valueToDelete;
    });
  }
  return arr;
}

function replaceValueInArray(arr, valueToReplace, valueToReplaceWith) {
  arr = removeItemByValueFromArray(arr, valueToReplace);
  if (!arr.includes(valueToReplaceWith)) {
    arr.push(valueToReplaceWith);
  }
  return arr;
}

// Warning: in addition to return the modified object, the given object is also modified.
// This function can also change the order of the properties.
function replaceMatchingPropertyNames(obj, nameToReplace, replacementName) {
  if (obj[nameToReplace]) {
    obj[replacementName] = obj[nameToReplace];
    delete obj[nameToReplace];
  }

  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      obj[key] = replaceMatchingPropertyNames(
        obj[key],
        nameToReplace,
        replacementName
      );
    }
  }
  return obj;
}

// Warning: in addition to return the modified object, the given object is also modified.
// The order of the properties is not changed by this function.
function replaceMatchingPropertyValues(obj, valToReplace, replacementVal) {
  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      obj[key] = replaceMatchingPropertyValues(
        obj[key],
        valToReplace,
        replacementVal
      );
    }

    if (obj[key] == valToReplace) {
      obj[key] = replacementVal;
    }
  }
  return obj;
}

// Sorts by the top-level property name or the specified child property name.
// When putMeFirst is non-null, that value will be put first, should it be encountered.
function sortObj(obj, childPropName = null, putMeFirst = null) {
  return Object.keys(obj)
    .sort((propNameA, propNameB) => {
      const valueA =
        childPropName == null ? propNameA : obj[propNameA][childPropName];
      const valueB =
        childPropName == null ? propNameB : obj[propNameB][childPropName];

      if (putMeFirst != null && valueA != valueB) {
        if (valueA == putMeFirst) {
          return -1;
        }
        if (valueB == putMeFirst) {
          return 1;
        }
      }

      return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
    })
    .reduce((result, propName) => {
      result[propName] = obj[propName];
      return result;
    }, {});
}

/**
 * Splits a non-empty string using the specified delimiter, optionally trimming the whitespace from each value.
 *
 * @param {String} str - The string to split.  Empty array returned if not a string or is a zero-length string.
 * @param {String} delim - The delimiter to split on.  Defaults to comma.
 * @param {Boolean} trim - Submit true to trim each split value.
 * @returns {Array} Array of values from the given string, or an empty array.
 */
function split(str, delim = ',', trim = true) {
  if (str && typeof str === 'string' && str.length > 0) {
    const arr = str.split(delim);
    if (trim === true) {
      return arr.map((val) => {
        return val.trim();
      });
    }
    return arr;
  }
  return [];
}

function splitHonoringPhrases(str, phraseDelim = '"') {
  let parts = [];
  str.split(phraseDelim).map((part, i) => {
    const isIndexEven = i % 2 == 0;
    if (isIndexEven) {
      // Even indexes are non-quoted strings that we are to make a token out of each.
      part = part.trim();
      if (part.length > 0) {
        parts = parts.concat(part.split(' '));
      }
    } else {
      // Odd pieces are quoted strings, which we should not further tokenize.
      if (part.length > 0) {
        parts.push(part);
      }
    }
  });
  return parts;
}

/**
 * Return an array of the given value, conditionally casting the value.
 *
 * @param {Object} val The object to return as an array.
 * @param {String} castTo The object type to cast each array value to.  When null, no cast is attempted.
 * @param {Boolean} isStart When castTo is 'dateTime', this parameter can influence the end of the value,
 *        when not a complete dateTime value.  Submit true if if the beginning values of the month, day, etc.
 *        should be used.
 * @returns {Array} An array representation of val.
 */
function toArray(val, castTo = null, isStart = true) {
  if (val == null) {
    return [];
  }

  if (Array.isArray(val)) {
    // data type is good
  } else if (val.toArray) {
    val = val.toArray();
  } else {
    val = [val];
  }

  if (castTo) {
    for (let i = 0; i <= val.length; i++) {
      if (val[i]) {
        if (castTo == 'string') {
          if (typeof val[i] != 'string') {
            val[i] = val[i] + '';
          }
        } else if (castTo == 'dateTime') {
          val[i] = convertPartialDateTimeToSeconds(val[i], isStart);
        } else if (
          castTo == 'number' ||
          castTo == 'float' ||
          castTo == 'long'
        ) {
          if (typeof val[i] != 'number') {
            const origValue = val[i];
            val[i] = +val[i];
            if (isNaN(val[i])) {
              throw new BadRequestError(
                `'${origValue}' is not a number; yet, a number is required.`
              );
            }
          }
        } else {
          throw new NotImplementedError(
            `toArray does not support a castTo parameter value of '${castTo}'.`
          );
        }
      }
    }
  }

  return val;
}

function camelCaseToWords(str, lowercase = false) {
  const words = str.match(/[^A-Z]+|([A-Z][^A-Z]*)/g).join(' ');
  return lowercase === true ? words.toLowerCase() : words;
}

function lowercaseFirstCharacter(str) {
  if (isNonEmptyString(str)) {
    return `${str.charAt(0).toLowerCase()}${str.slice(1)}`;
  }
  return str;
}

function uppercaseFirstCharacter(str) {
  if (isNonEmptyString(str)) {
    return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
  }
  return str;
}

function upToFirstUpperCaseCharacter(str) {
  if (isNonEmptyString(str)) {
    return str.match(/[^A-Z]+/)[0];
  }
  return str;
}

function escapeCharacters(str, char = '"') {
  return isNonEmptyString(char)
    ? str.replace(new RegExp(char, 'g'), `\\${char}`)
    : str;
}

function getDeepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Splits the string by comma.
// Odd entries are role names.
// Even entries are capability names.
// Example: "lux-endpoint-consumer,read,lux-writer,update"
// Unexpected format likely to result in an error.
// Returns an array of xdmp.permission returns.
function getDocPermissionsFromString(str) {
  const perms = [];
  const parts = str.split(',');
  if (parts.length % 2 == 0) {
    for (
      var roleNameIdx = 0, capabilityNameIdx = 1;
      roleNameIdx < parts.length;
      roleNameIdx += 2, capabilityNameIdx += 2
    ) {
      perms.push(
        xdmp.permission(
          parts[roleNameIdx].trim(),
          parts[capabilityNameIdx].trim()
        )
      );
    }
  }
  return perms;
}

function toShorthand(criteria, scope = null) {
  let shorthand = '';
  for (let propName in criteria) {
    if (criteria.hasOwnProperty(propName)) {
      const subCriteria = criteria[propName];
      if (Array.isArray(subCriteria)) {
        shorthand += `${propName}[ `;
        for (let i = 0; i < subCriteria.length; i++) {
          shorthand += toShorthand(subCriteria[i]);
          if (i < subCriteria.length - 1) {
            shorthand += ', ';
          }
        }
        shorthand += ' ]';
      } else if (typeof subCriteria == 'object') {
        shorthand += `${propName}.${toShorthand(subCriteria)}`;
      } else if (propName != '_lang') {
        let value = subCriteria;
        if (typeof value == 'string' && value.indexOf(IRI_PREFIX) == 0) {
          value = value.substring(IRI_PREFIX.length);
        }
        shorthand += `${propName} = '${value}'`;
      }
    }
  }
  scope = criteria._scope || scope;
  return `${scope != null ? `${scope}: ` : ''}${shorthand}`;
}

function logValues(label, valuesArr, sort = true, warning = false) {
  const hasValues = isNonEmptyArray(valuesArr);
  if (sort === true) {
    valuesArr = valuesArr.sort();
  }
  const message = `${label}: ${
    hasValues ? `\n\t${valuesArr.join('\n\t')}` : 'None'
  }`;
  if (warning === true && hasValues) {
    console.warn(message);
  } else {
    console.log(message);
  }
}

// Catch blocks can be given an instance of the Error primitive, which has three properties:
// name (may always be "Error"), message, and stack (optional).  Just in case a catch block
// receives something else, this function was introduced.
function getExceptionObjectElseMessage(e) {
  if (
    Object.keys(e).length == 0 &&
    e != null &&
    e != undefined &&
    typeof e.message == 'string'
  ) {
    return e.message;
  }
  return e;
}

function buildSearchUri({
  searchCriteria = null,
  scope = null,
  mayChangeScope = null,
  page = null,
  pageLength = null,
  sortDelimitedStr = null,
  facetsSoon = null,
  synonymsEnabled,
}) {
  const prefixAndQParam = `${SEARCH_PREFIX}/${scope}?q=${encodeURIComponent(
    JSON.stringify(searchCriteria)
  )}`;
  const mayChangeScopeParam = mayChangeScope
    ? `&mayChangeScope=${encodeURIComponent(mayChangeScope)}`
    : '';

  const pageParam = page ? `&page=${encodeURIComponent(page)}` : '';
  const pageLengthParam = pageLength
    ? `&pageLength=${encodeURIComponent(pageLength)}`
    : '';
  const sortDelimitedStrParam = sortDelimitedStr
    ? `&sort=${encodeURIComponent(sortDelimitedStr)}`
    : '';
  const facetsSoonParam = facetsSoon
    ? `&facetsSoon=${encodeURIComponent(facetsSoon)}`
    : '';
  const synonymsEnabledParam = synonymsEnabled
    ? `&synonymsEnabled=${encodeURIComponent(synonymsEnabled)}`
    : '';
  return (
    prefixAndQParam +
    mayChangeScopeParam +
    pageParam +
    pageLengthParam +
    sortDelimitedStrParam +
    facetsSoonParam +
    synonymsEnabledParam
  );
}

function buildSearchEstimateUri(searchCriteria, scope) {
  return `${SEARCH_ESTIMATE_PREFIX}/${scope}?q=${encodeURIComponent(
    JSON.stringify(searchCriteria)
  )}`;
}

function buildFacetsUri(searchCriteria, scope, name, page, pageLength) {
  return `${FACETS_PREFIX}/${scope}?q=${encodeURIComponent(
    JSON.stringify(searchCriteria)
  )}&name=${name}&page=${page}&pageLength=${pageLength}`;
}

function buildRelatedListUri({
  scope,
  name,
  uri,
  page = 1,
  pageLength = RELATED_LIST_PAGE_LENGTH_DEFAULT,
  relationshipsPerRelation = RELATED_LIST_PER_RELATION_DEFAULT,
}) {
  let relatedListUri = `${RELATED_LIST_PREFIX}/${scope}?name=${name}&uri=${encodeURIComponent(
    uri
  )}&page=${page}`;
  if (pageLength !== RELATED_LIST_PAGE_LENGTH_DEFAULT) {
    relatedListUri = relatedListUri + `&pageLength=${pageLength}`;
  }
  if (relationshipsPerRelation !== RELATED_LIST_PER_RELATION_DEFAULT) {
    relatedListUri =
      relatedListUri + `&relationshipsPerRelation=${relationshipsPerRelation}`;
  }
  return relatedListUri;
}

function buildScopeDescription(scopeDescriptor) {
  return `Records representing ${scopeDescriptor} that match your search.`;
}

export {
  areArraysEqual,
  arrayToString,
  assignRequestId,
  buildFacetsUri,
  buildRelatedListUri,
  buildScopeDescription,
  buildSearchEstimateUri,
  buildSearchUri,
  camelCaseToWords,
  checkPaginationParameters,
  escapeCharacters,
  evalInContentDatabase,
  evalInModulesDatabase,
  getArrayDiff,
  getArrayOverlap,
  getDeepCopy,
  getDocFromModulesDatabase,
  getDocPermissionsFromString,
  getExceptionObjectElseMessage,
  getMergedArrays,
  getObjectFromJson,
  getStartingPaginationIndexForOffset,
  getStartingPaginationIndexForSplice,
  getStartingPaginationIndexForSubsequence,
  isArray,
  isNonEmptyArray,
  isNonEmptyString,
  isObject,
  isString,
  logValues,
  lowercaseFirstCharacter,
  removeItemByIndexFromArray,
  removeItemByValueFromArray,
  replaceMatchingPropertyNames,
  replaceMatchingPropertyValues,
  replaceValueInArray,
  sortObj,
  split,
  splitHonoringPhrases,
  toArray,
  toShorthand,
  uppercaseFirstCharacter,
  upToFirstUpperCaseCharacter,
};
