import * as utils from '../utils/utils.mjs';
import { TOKEN_RUNTIME_PARAM } from '../lib/appConstants.mjs';
import {
  SEARCH_TERMS_CONFIG,
  getInverseSearchTermInfo,
} from '../config/searchTermsConfig.mjs';
import {
  PATTERN_NAME_HOP_WITH_FIELD,
  PATTERN_NAME_RELATED_LIST,
} from '../lib/searchPatternsLib.mjs';
import { RELATION_NAMES } from '../config/relationNames.mjs';
import {
  TENANT_OWNER,
  getEndpointAccessUnitNames,
} from '../lib/securityLib.mjs';

const uri = '/config/relatedListsConfig.mjs';
console.log(`Generating ${uri}`);

const RELATION_KEYS_TO_SUPPRESS = [
  'curated-containingItem-memberOf-usedForEvent',
  'curated-usedForEvent',
  'used-containingItem-memberOf-curatedBy',
  'used-curatedBy',
  //ignoring keys with relationScope of "set"
  'classificationOfSet-containingItem-memberOf-usedForEvent',
  'classificationOfSet-usedForEvent',

  //ignore all keys that start with publishedHere - #284
  'publishedHere-aboutAgent',
  'publishedHere-aboutConcept',
  'publishedHere-aboutPlace',
  'publishedHere-carriedBy-memberOf-usedForEvent',
  'publishedHere-classification',
  'publishedHere-createdAt',
  'publishedHere-createdBy',
  'publishedHere-language',
  'publishedHere-publishedAt',
  'publishedHere-publishedBy',

  //ignore all keys that end with publishedAt - #284
  'subjectOfAgent-publishedAt',
  'subjectOfConcept-publishedAt',
  'subjectOfPlace-publishedAt',
  'classificationOfWork-publishedAt',
  'created-publishedAt',
  'createdHere-publishedAt',
  'languageOf-publishedAt',
  'published-publishedAt',
];

const targetId = TOKEN_RUNTIME_PARAM;

const scopedTermsToPatternNames = {};
const skippedNonQualifyingTopLevelTerms = [];
const suppressedRelations = [];
const noRelationLabel = [];

function _isHopWithField(scopeName, termName) {
  return (
    scopedTermsToPatternNames[`${scopeName}.${termName}`] ==
    PATTERN_NAME_HOP_WITH_FIELD
  );
}

function _inverseIsDisqualifiedHopWithField(scopeName, termName) {
  const inverseSearchTermInfo = getInverseSearchTermInfo(scopeName, termName);
  return (
    inverseSearchTermInfo &&
    ['agent', 'concept', 'place'].includes(inverseSearchTermInfo.scopeName) &&
    inverseSearchTermInfo.patternName == PATTERN_NAME_HOP_WITH_FIELD
  );
}

function _getSearchConfigEntry(scopeName, targetScope, termName, subEntry) {
  return {
    scopeName,
    targetScope,
    termName,
    subEntry,
  };
}

function _getSearchConfigEntries(
  unitSearchTermsConfig,
  startingScope,
  endingScope,
  inBetweenScopes,
  maxLevel,
  currentLevel,
  report
) {
  const searchConfigEntries = [];
  Object.keys(unitSearchTermsConfig[startingScope]).forEach((termName) => {
    const termConfig = unitSearchTermsConfig[startingScope][termName];
    const targetScope = termConfig.targetScope;
    const matchesEndingScope = targetScope == endingScope;
    if (matchesEndingScope || inBetweenScopes.includes(targetScope)) {
      if (
        termConfig.patternName === PATTERN_NAME_RELATED_LIST ||
        _inverseIsDisqualifiedHopWithField(startingScope, termName) ||
        (currentLevel === 1 && matchesEndingScope)
      ) {
        if (report) {
          skippedNonQualifyingTopLevelTerms.push(
            `[${termConfig.patternName}] '${termName}' term in the ${startingScope}-to-${endingScope} list`
          );
        }
      } else {
        scopedTermsToPatternNames[`${startingScope}.${termName}`] =
          termConfig.patternName;

        if (matchesEndingScope) {
          searchConfigEntries.push(
            _getSearchConfigEntry(startingScope, targetScope, termName, null)
          );
        } else {
          addSubEntries(unitSearchTermsConfig, targetScope, termName);
        }
      }
    }
  });
  return searchConfigEntries;

  function addSubEntries(unitSearchTermsConfig, targetScope, termName) {
    const subEntries = _getSearchConfigEntries(
      unitSearchTermsConfig,
      targetScope,
      endingScope,
      // Not allowing any in-between scopes if current level is at the max level as that could result in
      // obscure relationships that dilute the value of the items displayed on entity pages.
      currentLevel < maxLevel ? inBetweenScopes : [],
      maxLevel,
      currentLevel + 1,
      report
    );
    subEntries.forEach((subEntry) => {
      searchConfigEntries.push(
        _getSearchConfigEntry(startingScope, targetScope, termName, subEntry)
      );
    });
  }
}

function _convertToRuntimeFormat(
  relatedListScopeName,
  relatedListTermName,
  searchConfigEntry,
  report
) {
  const criteria = {};
  let currentSpot = criteria;
  let relationKey = '';
  let relationScope = searchConfigEntry.targetScope;
  let mode = null;

  let isLast = searchConfigEntry == null;
  while (!isLast) {
    const scopeName = searchConfigEntry.scopeName;
    const termName = searchConfigEntry.termName;

    // First term dictates whether the runtime should perform a search or request values.
    if (mode === null) {
      mode = _isHopWithField(scopeName, termName) ? 'search' : 'values';
    }

    isLast = searchConfigEntry.subEntry == null;
    if (isLast) {
      // Last term dictates whether the child term should be iri or id.  We need iri
      // for Hop with Field terms to avoid a redirection to the Indexed Value pattern.
      const childTermName = _isHopWithField(scopeName, termName) ? 'iri' : 'id';
      currentSpot[termName] = {};
      currentSpot[termName][childTermName] = targetId;
      relationKey += termName;
    } else {
      currentSpot[termName] = {};
      currentSpot = currentSpot[termName];
      relationKey += `${termName}-`;
    }
    searchConfigEntry = searchConfigEntry.subEntry;
  }

  if (RELATION_KEYS_TO_SUPPRESS.includes(relationKey)) {
    if (report) {
      suppressedRelations.push(
        `[${relatedListScopeName}.${relatedListTermName}] ${relationKey}`
      );
    }
    return null;
  } else {
    if (!RELATION_NAMES[relationKey] && report) {
      noRelationLabel.push(
        `[${relatedListScopeName}.${relatedListTermName}] ${relationKey}`
      );
    }
    return {
      relationKey,
      relationScope,
      mode,
      criteria,
    };
  }
}

// Perform the following for LUX (all data / TENANT_OWNER) and all known units.
const relatedListsConfig = {};
[TENANT_OWNER].concat(getEndpointAccessUnitNames()).forEach((unitName) => {
  const unitRelatedListsConfig = {};
  const unitSearchTermsConfig = SEARCH_TERMS_CONFIG[unitName];
  const report = unitName == TENANT_OWNER;

  /*
   * STEP 1: Get a list of all 'related to' search terms.
   */
  const relatedListTermsInfo = [];
  Object.keys(unitSearchTermsConfig).forEach((scopeName) => {
    Object.keys(unitSearchTermsConfig[scopeName]).forEach((termName) => {
      if (termName.startsWith('relatedTo')) {
        relatedListTermsInfo.push({
          toScope: unitSearchTermsConfig[scopeName][termName].targetScope,
          termName,
          fromScope: scopeName,
          inBetweenScopes:
            unitSearchTermsConfig[scopeName][termName].inBetweenScopes,
          maxLevel: unitSearchTermsConfig[scopeName][termName].maxLevel,
        });
      }
    });
  });

  /*
   * STEP 2: Collect information on each related list, starting from the scope to return results of, working towards the scope
   * we will be given an ID of.  For example, for the agent to place list, we will be given an agent ID.  We need to start with
   * place, and find all paths to agent IDs.  This is not yet the runtime format.
   */
  relatedListTermsInfo.forEach((termInfo) => {
    const searchConfigEntries = _getSearchConfigEntries(
      unitSearchTermsConfig,
      termInfo.fromScope,
      termInfo.toScope,
      termInfo.inBetweenScopes,
      termInfo.maxLevel,
      1,
      report
    );
    if (utils.isNonEmptyArray(searchConfigEntries)) {
      if (!unitRelatedListsConfig[termInfo.fromScope]) {
        unitRelatedListsConfig[termInfo.fromScope] = {};
      }
      unitRelatedListsConfig[termInfo.fromScope][termInfo.termName] = {
        scopeName: termInfo.toScope,
        searchConfigEntries,
      };
    }
  });

  /*
   * STEP 3: Convert to the runtime format.  The outer structure is the same as the search term configuration whereby the
   * top-level properties are scope names and the next level down are search term names.  But, this is only for related list
   * search terms.  An example is `concept.relatedToAgent`.  The value of each search term property is an object that defines
   * the target scope and an array of search configurations.  See _convertToRuntimeFormat for lower level data model details.
   */
  Object.keys(unitRelatedListsConfig).forEach((toScope) => {
    Object.keys(unitRelatedListsConfig[toScope]).forEach((termName) => {
      const searchConfigs = [];
      const relatedListConfig = unitRelatedListsConfig[toScope][termName];
      relatedListConfig.searchConfigEntries.forEach((searchConfigEntry) => {
        const runtimeConfig = _convertToRuntimeFormat(
          toScope,
          termName,
          searchConfigEntry,
          report
        );
        if (runtimeConfig) {
          searchConfigs.push(runtimeConfig);
        }
      });
      unitRelatedListsConfig[toScope][termName] = {
        targetScope: toScope,
        searchConfigs,
      };
    });
  });

  relatedListsConfig[unitName] = unitRelatedListsConfig;
});

// Consolidated logging
utils.logValues(
  'Non-qualifying top-level terms for related lists',
  skippedNonQualifyingTopLevelTerms
);
utils.logValues('Suppressed relations', suppressedRelations);
utils.logValues('Relations without a label', noRelationLabel, true, true);

/*
 * STEP 4: Persist in the modules database
 */
function constructModuleNode(relatedListsConfig) {
  const textNode = new NodeBuilder();
  textNode.addText(`/*
 * THIS FILE IS PARTIALLY GENERATED BY THE BUILD SCRIPT.
 * IF EDITING, MAKE SURE YOU ARE EDITING THE SOURCE.
 *
 * Generated timestamp: ${new Date()}
 */
import { getCurrentUserUnitName } from '../lib/securityLib.mjs';
import { BadRequestError } from '../lib/mlErrorsLib.mjs';
  
const RELATED_LISTS_CONFIG = ${JSON.stringify(relatedListsConfig)};

function getRelatedListKeys() {
  const relatedListsConfig = _getRelatedListsConfig(true);
  const scopesToListNames = {};
  Object.keys(relatedListsConfig).forEach(scopeName => {
    scopesToListNames[scopeName] = [];
    Object.keys(relatedListsConfig[scopeName]).forEach(relatedListName => {
      scopesToListNames[scopeName].push(relatedListName);
    })
  })
  return scopesToListNames;
}

function hasRelatedList(scopeName, relatedListName) {
  return _getRelatedListConfig(scopeName, relatedListName) != null;
}

// Throws an error if the requested related list is not defined
function getRelatedListConfig(scopeName, relatedListName) {
  const config = _getRelatedListConfig(scopeName, relatedListName);
  if (!config) {
    throw new BadRequestError("No configuration for the '" + relatedListName + "' related list in the '" + scopeName + "' scope.");
  }
  // Need/should return a deep copy?
  return config;
}
  
// Does not throw an error if the requested related list is not defined
function _getRelatedListConfig(scopeName, relatedListName) {
  const relatedListsConfig = _getRelatedListsConfig(false);
  return relatedListsConfig[scopeName] ? relatedListsConfig[scopeName][relatedListName] : null;
}

// Get the configuration for all related lists available to the current user.
function _getRelatedListsConfig(mayThrowException = true) {
  const unitName = getCurrentUserUnitName()
  if (RELATED_LISTS_CONFIG[unitName] != null) {
    return RELATED_LISTS_CONFIG[unitName];
  }
  if (mayThrowException) {
    throw new BadRequestError("The related lists configuration for the '" + unitName + "' unit is not available.");
  }
  return null;
}

export {
  getRelatedListConfig,
  getRelatedListKeys,
  hasRelatedList
};`);
  return textNode.toNode();
}

const javascript = `
  const { uri, doc } = external;
  xdmp.documentInsert(uri, doc, {
    permissions: xdmp.documentGetPermissions(fn.subsequence(cts.uriMatch("*.mjs"), 1, 1))
  });
  'Related lists configuration generated.';
`;
utils.evalInModulesDatabase(
  javascript,
  {
    uri: uri,
    doc: constructModuleNode(relatedListsConfig),
  },
  true
);
