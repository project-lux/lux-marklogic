//#region Imports
import { InvalidSearchRequestError } from '../../errorClasses.mjs';
import {
  REG_EXP_NEAR_OPERATOR,
  SEARCH_GRAMMAR_OPERATORS,
} from '../../appConstants.mjs';
import { isSearchScopeName } from '../../searchScope.mjs';
import * as utils from '../../../utils/utils.mjs';
//#endregion

//#region Public functions
function adjustSearchString(givenQueryString) {
  // Find all operators within the search string. These are used later.
  const foundOperators = SEARCH_GRAMMAR_OPERATORS.filter((opName) => {
    const re = new RegExp(`\\s${opName}\\s`, 'i');
    return re.test(givenQueryString);
  });

  // Temporarily breakdown the given query, selectively modifying it before putting it back together.
  let adjusted = '';
  const bracketRegEx = new RegExp('[\\[\\]]', 'g');

  givenQueryString.split('"').map((piece, i) => {
    // Even indexes are non-quoted strings that may include multiple terms, operators, etc.
    const even = i % 2 === 0;
    if (even) {
      // Until we start supporting term-level options, remove all unquoted brackets as users are pasting
      // strings with them and receiving an error reading "unexpected token".
      piece = piece.replace(bracketRegEx, ' ');
      if (foundOperators.length > 0) {
        // Uppercase the operators
        foundOperators.forEach((opName) => {
          const re = new RegExp(`\\s${opName}\\s`, 'ig');
          piece = piece.replace(re, ` ${opName} `);
        });
      }
      // Until we support NEAR, lowercase NEAR to avoid search returning an error that it is not supported.
      piece = piece.replace(REG_EXP_NEAR_OPERATOR, '$1near$2');
      // Tokenize once more to perform term-level adjustments.
      adjusted += piece
        .split(/\s/)
        .map((term) =>
          // Terms containing more than one colon (e.g., ils:yul:mfhd:8752038) will not get past cts.parse
          // unless quoted. We cannot quote every term as that could change the meaning of the query
          // (e.g., AND vs "AND"). If we ever want to support the string grammar's colon operator, this
          // logic will need to be refined.
          term.includes(':') ? `"${term}"` : term,
        )
        .join(' ');
    } else {
      // Odd pieces are quoted strings, which happens to align with the requirement to not stem a *word* that is quoted.
      // Note that this is later ignored when the keyword search options do not apply, including all search tags configured
      // to the exact search option.
      const unstemmed = piece.match(' ') == null;
      adjusted += `"${piece}"${unstemmed ? '[unstemmed]' : ''}`;
    }
  });

  return adjusted;
}

function translateStringGrammarToJSON(scopeName, searchCriteria) {
  if (!isSearchScopeName(scopeName)) {
    throw new InvalidSearchRequestError(
      `'${scopeName}' is not a valid search scope.`,
    );
  }
  const adjusted = adjustSearchString(searchCriteria);
  let ctsQueryObj = null;
  try {
    ctsQueryObj = cts.parse(adjusted).toObject();
  } catch (e) {
    throw new InvalidSearchRequestError(
      `unable to parse criteria ${searchCriteria}`,
    );
  }
  return {
    _scope: scopeName,
    ...walkParsedQuery(ctsQueryObj),
  };
}

function walkParsedQuery(ctsQueryObj) {
  const out = {};
  for (const propName of Object.keys(ctsQueryObj)) {
    if (['andQuery', 'orQuery'].includes(propName)) {
      const operator = propName.substring(0, propName.length - 5).toUpperCase();
      out[operator] = [];
      if (utils.isNonEmptyArray(ctsQueryObj[propName].queries)) {
        for (const item of ctsQueryObj[propName].queries) {
          out[operator].push(walkParsedQuery(item));
        }
      }
    } else if (propName === 'notQuery') {
      out.NOT = [walkParsedQuery(ctsQueryObj.notQuery.query)];
    } else if (propName === 'boostQuery') {
      out.BOOST = [];
      out.BOOST.push(walkParsedQuery(ctsQueryObj.boostQuery.matchingQuery));
      out.BOOST.push(walkParsedQuery(ctsQueryObj.boostQuery.boostingQuery));
    } else if (propName === 'wordQuery') {
      out.text = ctsQueryObj.wordQuery.text[0];
      if (out.text.includes(' ')) out.text = `"${out.text}"`;
      for (const option of ctsQueryObj.wordQuery.options) {
        if (option === 'unstemmed') out._stemmed = false;
        else if (option.startsWith('lang=')) out._lang = option.substring(5);
        else
          console.log(
            `Ignoring search term option '${option}' from cts.parse result.`,
          );
      }
    } else {
      throw new InvalidSearchRequestError(
        `'${propName}' is not a supported portion of the search string grammar.`,
      );
    }
  }
  return out;
}
//#endregion

export { adjustSearchString, translateStringGrammarToJSON, walkParsedQuery };
