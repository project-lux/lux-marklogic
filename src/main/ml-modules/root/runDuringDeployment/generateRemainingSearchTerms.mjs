import { SEARCH_TERM_CONFIG } from '../../config/searchTermConfig.mjs';
import { FACETS_CONFIG } from '../../config/facetsConfig.mjs';
import {
  PATTERN_NAME_DATE_RANGE,
  PATTERN_NAME_HOP_INVERSE,
  PATTERN_NAME_INDEXED_RANGE,
  PATTERN_NAME_INDEXED_VALUE,
  PATTERN_NAME_PROPERTY_VALUE,
} from '../lib/searchPatternsLib.mjs';
import { getSearchScopeTypes } from '../lib/searchScope.mjs';
import { searchTermText } from '../config/userFacingConfig.mjs';
import { facetToScopeAndTermName } from '../utils/searchTermUtils.mjs';
import * as utils from '../utils/utils.mjs';

const uri = '/config/searchTermConfig.mjs';
console.log(`Adding remaining search terms within ${uri}`);

// Remove generated search terms --helpful when running the generateRemainingSearchTerms Gradle task
// after modifying related configuration.
let searchTermConfig = SEARCH_TERM_CONFIG;
Object.keys(searchTermConfig).forEach((scopeName) => {
  Object.keys(searchTermConfig[scopeName]).forEach((termName) => {
    if (searchTermConfig[scopeName][termName].generated === true) {
      delete searchTermConfig[scopeName][termName];
    }
  });
});

// Generate facet search terms.
Object.keys(FACETS_CONFIG).forEach((facetName) => {
  let { scopeName, termName } = facetToScopeAndTermName(facetName);

  const facetIndexReference = FACETS_CONFIG[facetName].indexReference;
  const isIdTerm = termName.endsWith('Id');
  const isDate = facetIndexReference.endsWith('DateStr');
  const isDimension = facetIndexReference.endsWith('DimensionValue');
  const isZeroOrOne = ['hasDigitalImage', 'isOnline'].includes(termName);

  let facetIdIndexReferences = [facetIndexReference];
  if (isDate) {
    facetIdIndexReferences = [
      facetIndexReference
        .substring(0, facetIndexReference.length - 3)
        .concat('Float'),
    ];
    facetIdIndexReferences.push(
      facetIdIndexReferences[0].replace('Start', 'End')
    );
  }

  let scalarType = 'string';
  if (isDate) {
    scalarType = 'dateTime';
  } else if (isDimension) {
    scalarType = 'float';
  } else if (isZeroOrOne) {
    scalarType = 'number';
  }

  // Get ready to add
  if (!searchTermConfig[scopeName]) {
    searchTermConfig[scopeName] = {};
  }

  if (isIdTerm) {
    const parentTermName = termName.substring(0, termName.length - 2);
    if (!searchTermConfig[scopeName][parentTermName]) {
      searchTermConfig[scopeName][parentTermName] = {
        idIndexReferences: facetIdIndexReferences,
      };
    } else {
      // Try to add our indexes.
      const searchTermIdIndexReferences =
        searchTermConfig[scopeName][parentTermName].idIndexReferences;
      if (searchTermIdIndexReferences == null) {
        searchTermConfig[scopeName][parentTermName].idIndexReferences =
          facetIdIndexReferences;
      } else if (
        utils.getArrayDiff(facetIdIndexReferences, searchTermIdIndexReferences)
          .length > 0
      ) {
        // Merge the ID index arrays
        const mergedArrays = utils.getMergedArrays(
          searchTermIdIndexReferences,
          facetIdIndexReferences
        );
        searchTermConfig[scopeName][parentTermName].idIndexReferences =
          mergedArrays;
        console.log(
          `[scope=${scopeName}] Merged search term ${parentTermName}'s ID index references to ['${mergedArrays.join(
            "', '"
          )}'], as specified by the facet configuration.`
        );
      } else {
        console.log(
          `[scope=${scopeName}] The search term ${parentTermName}'s ID index reference matches the facet configuration, and could be omitted from the search criteria configuration.`
        );
      }
    }
  } else {
    if (searchTermConfig[scopeName][termName]) {
      console.warn(
        `[scope=${scopeName}] Overriding search term '${termName}' with settings from the facet configuration; consider ensuring facet configuration is correct and omitting from the search criteria configuration.`
      );
    }

    const patternName = isDate
      ? PATTERN_NAME_DATE_RANGE
      : isDimension
      ? PATTERN_NAME_INDEXED_RANGE
      : PATTERN_NAME_INDEXED_VALUE;

    searchTermConfig[scopeName][termName] = {
      patternName: patternName,
      indexReferences: facetIdIndexReferences,
      scalarType,
      generated: true,
    };

    if (isDate) {
      searchTermConfig[scopeName][termName].isStartDate =
        termName.indexOf('Start') > -1 ? true : false;
    }
  }
});

// Generate the hop inverse search terms.
Object.keys(searchTermConfig).forEach((scopeName) => {
  Object.keys(searchTermConfig[scopeName]).forEach((termName) => {
    if (
      searchTermConfig[scopeName][termName].hopInverseName &&
      searchTermConfig[scopeName][termName].targetScope &&
      searchTermConfig[scopeName][termName].predicates &&
      searchTermConfig[scopeName][termName].generated !== true
    ) {
      const newScopeName = searchTermConfig[scopeName][termName].targetScope;
      const newTermName = searchTermConfig[scopeName][termName].hopInverseName;
      if (!searchTermConfig[newScopeName]) {
        searchTermConfig[newScopeName] = {};
      }
      if (searchTermConfig[newScopeName][newTermName]) {
        const msg = `Search term '${newTermName}' in the '${newScopeName}' scope already exists yet search term '${termName}' in the '${scopeName}' scope is configured to create it. Please address and try again.`;
        console.error(msg);
        throw new Error(msg);
      }
      const newTargetScopeName = scopeName;
      searchTermConfig[newScopeName][newTermName] = {
        patternName: PATTERN_NAME_HOP_INVERSE,
        predicates: searchTermConfig[scopeName][termName].predicates,
        targetScope: newTargetScopeName,
        hopInverseName: termName, // added for getInverseSearchTermInfo
        generated: true,
      };
    }
  });
});

// Add a type search term to each scope (even though a couple scopes only have one type).
Object.keys(searchTermConfig).forEach((scopeName) => {
  const termName = 'recordType'; // 'type' is already used by facets for classification type.
  if (searchTermConfig[scopeName][termName]) {
    console.warn(
      `[scope=${scopeName}] Overriding search term '${termName}'; consider omitting from the search criteria configuration or updating the remaining search terms generator.`
    );
  }
  searchTermConfig[scopeName][termName] = {
    patternName: PATTERN_NAME_PROPERTY_VALUE,
    propertyNames: ['dataType'],
    scalarType: 'string',
    forceExactMatch: true,
    generated: true,
  };
});

// Add an iri search term to each scope.
Object.keys(searchTermConfig).forEach((scopeName) => {
  const termName = 'iri';
  if (searchTermConfig[scopeName][termName]) {
    console.warn(
      `[scope=${scopeName}] Overriding search term '${termName}'; consider omitting from the search criteria configuration or updating the remaining search terms generator.`
    );
  }
  searchTermConfig[scopeName][termName] = {
    patternName: 'iri',
    generated: true,
  };
});

// Add one ID search term per type per scope that has the associated property.
Object.keys(searchTermConfig).forEach((scopeName) => {
  getSearchScopeTypes(scopeName).forEach((type) => {
    // Require data backing this search term be in the dataset.
    const termName = `${utils.lowercaseFirstCharacter(type)}Id`;
    if (
      cts.estimate(cts.jsonPropertyScopeQuery(termName, cts.trueQuery())) > 0
    ) {
      if (searchTermConfig[scopeName][termName]) {
        console.warn(
          `[scope=${scopeName}] Overriding search term '${termName}'; consider omitting from the search criteria configuration or updating the remaining search terms generator.`
        );
      }
      searchTermConfig[scopeName][termName] = {
        patternName: PATTERN_NAME_PROPERTY_VALUE,
        propertyNames: [termName],
        scalarType: 'string',
        forceExactMatch: true,
        generated: true,
      };
    } else {
      console.log(
        `[scope=${scopeName}] Skipping definition of search term '${termName}' as no records contain the '${termName}' property.`
      );
    }
  });
});

// Add labels and help text.
Object.keys(searchTermText).forEach((scopeName) => {
  Object.keys(searchTermText[scopeName]).forEach((termName) => {
    if (searchTermConfig[scopeName][termName]) {
      searchTermConfig[scopeName][termName] = {
        ...searchTermConfig[scopeName][termName],
        ...searchTermText[scopeName][termName],
      };
    }
  });
});

// Sort by key within each scope.
Object.keys(searchTermConfig).forEach((scopeName) => {
  searchTermConfig[scopeName] = utils.sortObj(searchTermConfig[scopeName]);
});
searchTermConfig = utils.sortObj(searchTermConfig);

// Write to the modules database.
function constructModuleNode(searchTermConfig) {
  const textNode = new NodeBuilder();
  textNode.addText(`/*
 * THIS FILE IS PARTIALLY GENERATED BY THE BUILD SCRIPT.
 * IF EDITING, MAKE SURE YOU ARE EDITING THE SOURCE.
 *
 * Generated timestamp: ${new Date()}
 */
const SEARCH_TERM_CONFIG = ${JSON.stringify(searchTermConfig)};

function getInverseSearchTermInfo(scopeFrom, searchTermName) {
  if (
    SEARCH_TERM_CONFIG[scopeFrom] &&
    SEARCH_TERM_CONFIG[scopeFrom][searchTermName] &&
    SEARCH_TERM_CONFIG[scopeFrom][searchTermName].targetScope &&
    SEARCH_TERM_CONFIG[scopeFrom][searchTermName].hopInverseName
  ) {
    const inverseScope =
      SEARCH_TERM_CONFIG[scopeFrom][searchTermName].targetScope;
    const inverseTermName =
      SEARCH_TERM_CONFIG[scopeFrom][searchTermName].hopInverseName;
    if (
      SEARCH_TERM_CONFIG[inverseScope] &&
      SEARCH_TERM_CONFIG[inverseScope][inverseTermName]
    ) {
      return {
        scopeName: inverseScope,
        searchTermName: inverseTermName,
        patternName:
          SEARCH_TERM_CONFIG[inverseScope][inverseTermName].patternName,
      };
    }
  }
  return null;
}

function getSearchTermConfig(scopeName, termName) {
  return SEARCH_TERM_CONFIG[scopeName] != null &&
    SEARCH_TERM_CONFIG[scopeName][termName] != null
    ? SEARCH_TERM_CONFIG[scopeName][termName]
    : null;
}

function getSearchTermNames(scopeFrom, scopeTo = null) {
  let names = [];
  if (SEARCH_TERM_CONFIG[scopeFrom]) {
    const candidateNames = Object.keys(SEARCH_TERM_CONFIG[scopeFrom]);
    if (!scopeTo) {
      names = candidateNames;
    } else {
      candidateNames.forEach((termName) => {
        if (SEARCH_TERM_CONFIG[scopeFrom][termName].targetScope == scopeTo) {
          names.push(termName);
        }
      });
    }
  }
  return names;
}

export {
  SEARCH_TERM_CONFIG,
  getInverseSearchTermInfo,
  getSearchTermConfig,
  getSearchTermNames,
};`);
  return textNode.toNode();
}

const javascript = `
  const { uri, doc } = external;
  xdmp.documentInsert(uri, doc, {
    permissions: xdmp.documentGetPermissions(fn.subsequence(cts.uriMatch("*.mjs"), 1, 1))
  });
  uri + " updated with remaining search terms."
`;
utils.evalInModulesDatabase(
  javascript,
  {
    uri: uri,
    doc: constructModuleNode(searchTermConfig),
  },
  true
);
