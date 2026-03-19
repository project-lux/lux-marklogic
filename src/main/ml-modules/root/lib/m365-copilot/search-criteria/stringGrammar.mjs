// StringGrammar.mjs
import { InvalidSearchRequestError } from '../../errorClasses.mjs';
import {
  REG_EXP_NEAR_OPERATOR,
  SEARCH_GRAMMAR_OPERATORS,
} from '../../appConstants.mjs';
import { isSearchScopeName } from '../../searchScope.mjs';

// UNIT TEST CANDIDATE: operator normalization, bracket removal, NEAR downcase, colon quoting
export function adjustSearchString(givenQueryString) {
  const foundOperators = SEARCH_GRAMMAR_OPERATORS.filter((opName) => {
    const re = new RegExp(`\\s${opName}\\s`, 'i');
    return re.test(givenQueryString);
  });

  let adjusted = '';
  const bracketRegEx = new RegExp('[\\[\\]]', 'g');

  givenQueryString.split('"').map((piece, i) => {
    const even = i % 2 === 0;
    if (even) {
      piece = piece.replace(bracketRegEx, ' ');
      if (foundOperators.length > 0) {
        foundOperators.forEach((opName) => {
          const re = new RegExp(`\\s${opName}\\s`, 'ig');
          piece = piece.replace(re, ` ${opName} `);
        });
      }
      piece = piece.replace(REG_EXP_NEAR_OPERATOR, '$1near$2');
      adjusted += piece
        .split(/\s/)
        .map((term) => (term.includes(':') ? `"${term}"` : term))
        .join(' ');
    } else {
      const unstemmed = piece.match(' ') == null;
      adjusted += `"${piece}"${unstemmed ? '[unstemmed]' : ''}`;
    }
  });

  return adjusted;
}

// UNIT TEST CANDIDATE: end-to-end parse failures and success paths
export function translateStringGrammarToJSON(scopeName, searchCriteria) {
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

// UNIT TEST CANDIDATE: mapping shapes from cts.parse to our JSON grammar
export function walkParsedQuery(ctsQueryObj) {
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
