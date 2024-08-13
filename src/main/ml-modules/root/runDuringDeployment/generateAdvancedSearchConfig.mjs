import { getSearchTermsConfig } from '../config/searchTermsConfig.mjs';
import {
  PATTERN_NAME_RELATED_LIST,
  PATTERN_NAME_SIMILAR,
  PATTERN_NAME_TEXT,
  getAllowedSearchOptionsByOptionsName,
  getAllowedSearchOptionsNameByPatternName,
  getDefaultSearchOptionsByOptionsName,
  getDefaultSearchOptionsNameByPatternName,
} from '../lib/searchPatternsLib.mjs';
import * as utils from '../utils/utils.mjs';
import { getOrderedUserInterfaceSearchScopeNames } from '../lib/searchScope.mjs';
import { SearchTermConfig } from '../lib/SearchTermConfig.mjs';
import { getContextParameterValue } from '../config/autoCompleteConfig.mjs';

const uri = '/config/advancedSearchConfig.mjs';
console.log(`Generating ${uri}`);

const SEARCH_TERMS_CONFIG = getSearchTermsConfig();

// Arrays for consolidating logging.
const unknownPattern = [];
const noAllowedOptions = [];
const noDefaultsOptions = [];
const noLabel = [];
const noHelpText = [];

const allOptionsNames = [];
function recordOptionsNames(allowedOptionsName, defaultOptionsName) {
  if (allowedOptionsName && !allOptionsNames.includes(allowedOptionsName)) {
    allOptionsNames.push(allowedOptionsName);
  }
  if (defaultOptionsName && !allOptionsNames.includes(defaultOptionsName)) {
    allOptionsNames.push(defaultOptionsName);
  }
}

function createEntry(scopeName, termName, termConfig) {
  const entry = {};

  const patternName = termConfig.getPatternName();
  const scalarTypeIsBoolean =
    termConfig.hasIndexReferences() &&
    termConfig.getIndexReferences()[0].endsWith('Boolean');
  const scalarType = scalarTypeIsBoolean
    ? 'boolean'
    : termConfig.getScalarType();

  if (termConfig.hasLabel()) {
    entry.label = termConfig.getLabel();
  } else {
    noLabel.push(`${scopeName}.${termName}`);
  }

  if (termConfig.hasHelpText()) {
    entry.helpText = termConfig.getHelpText();
  } else {
    noHelpText.push(`${scopeName}.${termName}`);
  }

  const targetScopeName = termConfig.getTargetScopeName();
  if (targetScopeName) {
    entry.relation = targetScopeName;
  } else if ('dateTime' == scalarType) {
    entry.relation = 'date';
  } else if ('float' == scalarType) {
    entry.relation = 'float';
  } else if (termName == 'name') {
    entry.relation = 'text';
  } else if (termName == 'identifier') {
    entry.relation = 'text';
  } else if (termName == 'id') {
    entry.relation = 'text';
  } else if (PATTERN_NAME_TEXT == patternName) {
    entry.relation = 'text';
  } else if (PATTERN_NAME_SIMILAR == patternName) {
    entry.relation = 'id';
  } else if (scalarTypeIsBoolean) {
    entry.relation = 'boolean';
  } else {
    entry.relation = 'text';
  }

  const autoCompleteContext = getContextParameterValue(scopeName, termName);
  if (autoCompleteContext) {
    entry.autoCompleteContext = autoCompleteContext;
  }

  let allowedOptionsName = null;
  let defaultOptionsName = null;
  if (patternName) {
    allowedOptionsName = getAllowedSearchOptionsNameByPatternName(patternName);
    if (allowedOptionsName) {
      entry.allowedOptionsName = allowedOptionsName;
      defaultOptionsName =
        getDefaultSearchOptionsNameByPatternName(patternName);
      if (defaultOptionsName) {
        entry.defaultOptionsName = defaultOptionsName;
      } else {
        noDefaultsOptions.push(`[${patternName}] ${scopeName}.${termName}`);
      }
    } else {
      noAllowedOptions.push(`[${patternName}] ${scopeName}.${termName}`);
    }
  } else {
    unknownPattern.push(`${scopeName}.${termName}`);
  }
  recordOptionsNames(allowedOptionsName, defaultOptionsName);

  return entry;
}

const advancedSearchConfigs = { terms: {}, options: {} };
const omittedTermNames = [];
getOrderedUserInterfaceSearchScopeNames()
  .concat('set') // Multiple terms need to go through this scope; not true for the reference scope.
  .sort()
  .forEach((scopeName) => {
    advancedSearchConfigs.terms[scopeName] = {};
    Object.keys(SEARCH_TERMS_CONFIG[scopeName])
      .sort()
      .forEach((termName) => {
        const termConfig = new SearchTermConfig(
          SEARCH_TERMS_CONFIG[scopeName][termName]
        );
        const patternName = termConfig.getPatternName();

        // Suppress search terms that may never be exposed via advanced search and those
        // the frontend is not yet ready for.
        let add = true;
        if (
          [
            'any', // Term may no longer exist.
            'classificationOfReference',
            'classificationOfSet',
            'iri',
            'recordType',
            'subject',
          ].includes(termName) &&
          (!termConfig.hasLabel() || !termConfig.hasHelpText())
        ) {
          add = false;
        } else if (termName.endsWith('Id')) {
          add = false;
        }
        // 20230420, bhartwig: asked to suppress Similar terms.
        else if (
          [PATTERN_NAME_RELATED_LIST, PATTERN_NAME_SIMILAR].includes(
            patternName
          )
        ) {
          add = false;
        }

        if (add) {
          advancedSearchConfigs.terms[scopeName][termName] = createEntry(
            scopeName,
            termName,
            termConfig
          );
        } else {
          omittedTermNames.push(`[${patternName}] ${scopeName}.${termName}`);
        }
      });
  });

// Within each scope, sort by the search term's label.
Object.keys(advancedSearchConfigs.terms).forEach((scopeName) => {
  advancedSearchConfigs.terms[scopeName] = utils.sortObj(
    advancedSearchConfigs.terms[scopeName],
    'label',
    'Name' // If this label changes, this should be updated to match.
  );
});

// Provide mapping from options name to its allowed and default options.
allOptionsNames.forEach((name) => {
  advancedSearchConfigs.options[name] = {
    allowed: getAllowedSearchOptionsByOptionsName(name),
    default: getDefaultSearchOptionsByOptionsName(name),
  };
});

// Consolidated log entries
utils.logValues(
  'Advanced search-included search terms that have allowed search options but no default search options',
  noDefaultsOptions
);
utils.logValues(
  'Advanced search-included search terms that do not have allowed or default search options',
  noAllowedOptions
);
utils.logValues(
  'Advanced search-included search terms for which a search pattern could not be determined',
  unknownPattern,
  true,
  true
);
utils.logValues('Search terms omitted from advanced search', omittedTermNames);
utils.logValues(
  'Advanced search-included search terms without a label',
  noLabel
);
utils.logValues(
  'Advanced search-included search terms without help text',
  noHelpText
);

function constructModuleNode(advancedSearchConfigs) {
  const textNode = new NodeBuilder();
  textNode.addText(`/*
 * THIS FILE IS GENERATED BY THE BUILD SCRIPT.
 * IF EDITING, MAKE SURE YOU ARE EDITING THE SOURCE.
 *
 * Generated timestamp: ${new Date()}
 */
const ADVANCED_SEARCH_CONFIG = ${JSON.stringify(advancedSearchConfigs)};

export { ADVANCED_SEARCH_CONFIG };`);
  return textNode.toNode();
}

const javascript = `
  const { uri, doc } = external;
  xdmp.documentInsert(uri, doc, {
    permissions: xdmp.documentGetPermissions(fn.subsequence(cts.uriMatch("*.mjs"), 1, 1))
  });
  'Advanced search configuration generated.';
`;
utils.evalInModulesDatabase(
  javascript,
  {
    uri: uri,
    doc: constructModuleNode(advancedSearchConfigs),
  },
  true
);
