import { SEARCH_TERMS_CONFIG } from '../../config/searchTermsConfig.mjs';
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
import {
  UNRESTRICTED_UNIT_NAME,
  getRestrictedUnitNames,
  isSearchTermForUnit,
} from '../lib/unitLib.mjs';

const uri = '/config/searchTermsConfig.mjs';
console.log(`Adding remaining search terms within ${uri}`);

const regenerate = SEARCH_TERMS_CONFIG[UNRESTRICTED_UNIT_NAME] != null;
const BASE_CONFIG = regenerate
  ? SEARCH_TERMS_CONFIG[UNRESTRICTED_UNIT_NAME]
  : SEARCH_TERMS_CONFIG;

// Remove generated search terms.
if (regenerate) {
  Object.keys(BASE_CONFIG).forEach((scopeName) => {
    Object.keys(BASE_CONFIG[scopeName]).forEach((termName) => {
      if (BASE_CONFIG[scopeName][termName].generated === true) {
        delete BASE_CONFIG[scopeName][termName];
      }
    });
  });
}

const reportInfo = (unitName, msg) => {
  if (unitName == UNRESTRICTED_UNIT_NAME) {
    console.log(msg);
  }
};

const reportWarning = (unitName, msg) => {
  if (unitName == UNRESTRICTED_UNIT_NAME) {
    console.warn(msg);
  }
};

// Deemed safer to have a single loop for all the units versus multiple.
const searchTermsConfig = {};
[UNRESTRICTED_UNIT_NAME]
  .concat(getRestrictedUnitNames())
  .forEach((unitName) => {
    const unitConfig = JSON.parse(JSON.stringify(BASE_CONFIG));

    // Drop any not intended for this unit.
    Object.keys(unitConfig).forEach((scopeName) => {
      Object.keys(unitConfig[scopeName]).forEach((termName) => {
        if (!isSearchTermForUnit(unitName, unitConfig[scopeName][termName])) {
          console.log(
            `[scope=${scopeName}] Dropping the ${termName} search term from ${unitName}'s configuration.`
          );
          delete unitConfig[scopeName][termName];
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
      if (!unitConfig[scopeName]) {
        unitConfig[scopeName] = {};
      }

      if (isIdTerm) {
        const parentTermName = termName.substring(0, termName.length - 2);
        if (!unitConfig[scopeName][parentTermName]) {
          unitConfig[scopeName][parentTermName] = {
            idIndexReferences: facetIdIndexReferences,
          };
        } else {
          // Try to add our indexes.
          const searchTermIdIndexReferences =
            unitConfig[scopeName][parentTermName].idIndexReferences;
          if (searchTermIdIndexReferences == null) {
            unitConfig[scopeName][parentTermName].idIndexReferences =
              facetIdIndexReferences;
          } else if (
            utils.getArrayDiff(
              facetIdIndexReferences,
              searchTermIdIndexReferences
            ).length > 0
          ) {
            // Merge the ID index arrays
            const mergedArrays = utils.getMergedArrays(
              searchTermIdIndexReferences,
              facetIdIndexReferences
            );
            unitConfig[scopeName][parentTermName].idIndexReferences =
              mergedArrays;
            reportInfo(
              unitName,
              `[scope=${scopeName}] Merged search term ${parentTermName}'s ID index references to ['${mergedArrays.join(
                "', '"
              )}'], as specified by the facet configuration.`
            );
          } else {
            reportInfo(
              unitName,
              `[scope=${scopeName}] The search term ${parentTermName}'s ID index reference matches the facet configuration, and could be omitted from the search criteria configuration.`
            );
          }
        }
      } else {
        if (unitConfig[scopeName][termName]) {
          reportWarning(
            unitName,
            `[scope=${scopeName}] Overriding search term '${termName}' with settings from the facet configuration; consider ensuring facet configuration is correct and omitting from the search criteria configuration.`
          );
        }

        const patternName = isDate
          ? PATTERN_NAME_DATE_RANGE
          : isDimension
          ? PATTERN_NAME_INDEXED_RANGE
          : PATTERN_NAME_INDEXED_VALUE;

        unitConfig[scopeName][termName] = {
          patternName: patternName,
          indexReferences: facetIdIndexReferences,
          scalarType,
          generated: true,
        };

        if (isDate) {
          unitConfig[scopeName][termName].isStartDate =
            termName.indexOf('Start') > -1 ? true : false;
        }
      }
    });

    // Generate the hop inverse search terms.
    Object.keys(unitConfig).forEach((scopeName) => {
      Object.keys(unitConfig[scopeName]).forEach((termName) => {
        if (
          unitConfig[scopeName][termName].hopInverseName &&
          unitConfig[scopeName][termName].targetScope &&
          unitConfig[scopeName][termName].predicates &&
          unitConfig[scopeName][termName].generated !== true
        ) {
          const newScopeName = unitConfig[scopeName][termName].targetScope;
          const newTermName = unitConfig[scopeName][termName].hopInverseName;
          if (unitConfig[newScopeName][newTermName]) {
            const msg = `Search term '${newTermName}' in the '${newScopeName}' scope already exists yet search term '${termName}' in the '${scopeName}' scope is configured to create it. Please address and try again.`;
            console.error(msg);
            throw new Error(msg);
          }
          if (!unitConfig[newScopeName]) {
            unitConfig[newScopeName] = {};
          }
          unitConfig[newScopeName][newTermName] = {
            patternName: PATTERN_NAME_HOP_INVERSE,
            predicates: unitConfig[scopeName][termName].predicates,
            targetScope: scopeName,
            hopInverseName: termName, // added for getInverseSearchTermInfo
            generated: true,
          };
        }
      });
    });

    // Add a type search term to each scope (even though a couple scopes only have one type).
    Object.keys(unitConfig).forEach((scopeName) => {
      const termName = 'recordType'; // 'type' is already used by facets for classification type.
      if (
        unitConfig[scopeName][termName] &&
        // Generated check shouldn't be necessary but I found it to be.
        unitConfig[scopeName][termName].generated !== true
      ) {
        reportWarning(
          unitName,
          `[scope=${scopeName}] Overriding search term '${termName}'; consider omitting from the search criteria configuration or updating the remaining search terms generator.`
        );
      }
      if (!unitConfig[scopeName]) {
        unitConfig[scopeName] = {};
      }
      unitConfig[scopeName][termName] = {
        patternName: PATTERN_NAME_PROPERTY_VALUE,
        propertyNames: ['dataType'],
        scalarType: 'string',
        forceExactMatch: true,
        generated: true,
      };
    });

    // Add an iri search term to each scope.
    Object.keys(unitConfig).forEach((scopeName) => {
      const termName = 'iri';
      if (unitConfig[scopeName][termName]) {
        reportWarning(
          unitName,
          `[scope=${scopeName}] Overriding search term '${termName}'; consider omitting from the search criteria configuration or updating the remaining search terms generator.`
        );
      }
      unitConfig[scopeName][termName] = {
        patternName: 'iri',
        generated: true,
      };
    });

    // Add one ID search term per type per scope that has the associated property.
    Object.keys(unitConfig).forEach((scopeName) => {
      getSearchScopeTypes(scopeName).forEach((type) => {
        // Require data backing this search term be in the dataset.
        const termName = `${utils.lowercaseFirstCharacter(type)}Id`;
        if (
          cts.estimate(cts.jsonPropertyScopeQuery(termName, cts.trueQuery())) >
          0
        ) {
          if (unitConfig[scopeName][termName]) {
            reportWarning(
              unitName,
              `[scope=${scopeName}] Overriding search term '${termName}'; consider omitting from the search criteria configuration or updating the remaining search terms generator.`
            );
          }
          unitConfig[scopeName][termName] = {
            patternName: PATTERN_NAME_PROPERTY_VALUE,
            propertyNames: [termName],
            scalarType: 'string',
            forceExactMatch: true,
            generated: true,
          };
        } else {
          reportInfo(
            unitName,
            `[scope=${scopeName}] Skipping definition of search term '${termName}' as no records contain the '${termName}' property.`
          );
        }
      });
    });

    // Add labels and help text.
    Object.keys(searchTermText).forEach((scopeName) => {
      Object.keys(searchTermText[scopeName]).forEach((termName) => {
        if (unitConfig[scopeName][termName]) {
          unitConfig[scopeName][termName] = {
            ...unitConfig[scopeName][termName],
            ...searchTermText[scopeName][termName],
          };
        }
      });
    });

    // Sort by key within each scope.
    Object.keys(unitConfig).forEach((scopeName) => {
      unitConfig[scopeName] = utils.sortObj(unitConfig[scopeName]);
    });
    searchTermsConfig[unitName] = utils.sortObj(unitConfig);
  });

// Write to the modules database.
function constructModuleNode(searchTermsConfig) {
  const textNode = new NodeBuilder();
  textNode.addText(`/*
 * THIS FILE IS PARTIALLY GENERATED BY THE BUILD SCRIPT.
 * IF EDITING, MAKE SURE YOU ARE EDITING THE SOURCE.
 *
 * Generated timestamp: ${new Date()}
 */
import { getCurrentUserUnitName } from '../lib/unitLib.mjs';
import { BadRequestError } from '../lib/mlErrorsLib.mjs';

const SEARCH_TERMS_CONFIG = ${JSON.stringify(searchTermsConfig)};

function getInverseSearchTermInfo(scopeFrom, searchTermName) {
  const searchTermsConfig = getSearchTermsConfig();
  if (
    searchTermsConfig[scopeFrom] &&
    searchTermsConfig[scopeFrom][searchTermName] &&
    searchTermsConfig[scopeFrom][searchTermName].targetScope &&
    searchTermsConfig[scopeFrom][searchTermName].hopInverseName
  ) {
    const inverseScope =
      searchTermsConfig[scopeFrom][searchTermName].targetScope;
    const inverseTermName =
      searchTermsConfig[scopeFrom][searchTermName].hopInverseName;
    if (
      searchTermsConfig[inverseScope] &&
      searchTermsConfig[inverseScope][inverseTermName]
    ) {
      return {
        scopeName: inverseScope,
        searchTermName: inverseTermName,
        patternName:
          searchTermsConfig[inverseScope][inverseTermName].patternName,
      };
    }
  }
  return null;
}

function getSearchTermConfig(scopeName, termName) {
  const searchTermsConfig = getSearchTermsConfig();
  return searchTermsConfig[scopeName] != null &&
    searchTermsConfig[scopeName][termName] != null
    ? searchTermsConfig[scopeName][termName]
    : null;
}

// Get the configuration for all search terms applicable to the current user.
function getSearchTermsConfig() {
  const unitName = getCurrentUserUnitName()
  if (SEARCH_TERMS_CONFIG[unitName] != null) {
    return SEARCH_TERMS_CONFIG[unitName];
  }
  throw new BadRequestError("The search term configuration for the '" + unitName + "' unit is not available.");
}

function getSearchTermNames(scopeFrom, scopeTo = null) {
  let names = [];
  const searchTermsConfig = getSearchTermsConfig();
  if (searchTermsConfig[scopeFrom]) {
    const candidateNames = Object.keys(searchTermsConfig[scopeFrom]);
    if (!scopeTo) {
      names = candidateNames;
    } else {
      candidateNames.forEach((termName) => {
        if (searchTermsConfig[scopeFrom][termName].targetScope == scopeTo) {
          names.push(termName);
        }
      });
    }
  }
  return names;
}

export {
  SEARCH_TERMS_CONFIG, // only generators are to import this.
  getInverseSearchTermInfo,
  getSearchTermConfig,
  getSearchTermsConfig,
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
    doc: constructModuleNode(searchTermsConfig),
  },
  true
);
