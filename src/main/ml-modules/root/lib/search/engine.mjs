'use strict';

//#region Imports
import op from '/MarkLogic/optic.mjs';
import { getSearchScopeTypes, isSearchScopeName } from '../searchScope.mjs';
import * as utils from '../../utils/utils.mjs';
import { convertPartialDateTimeToSeconds } from '../../utils/dateUtils.mjs';
import {
  getSearchTermNames,
  getSearchTermConfig,
} from '../../config/searchTermsConfig.mjs';
import {
  DEFAULT_SEARCH_OPTIONS_EXACT,
  DEFAULT_SEARCH_OPTIONS_KEYWORD,
} from '../appConstants.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
  NotImplementedError,
} from '../errorClasses.mjs';
import { SearchTerm } from '../search/SearchTerm.mjs';
import { SearchTermConfig } from '../search/SearchTermConfig.mjs';
import { PatternOptions } from '../search/patterns.mjs';
import { HopWithFieldPattern } from '../search/patterns/HopWithField.mjs';
import { SearchCriteriaProcessor } from '../SearchCriteriaProcessor.mjs';
//#endregion

//#region Constants
// TODO: remove global debug array from MJS context.
const DEBUG = [];

// Optic comparison operators
const COMPARATORS = {
  '=': op.eq,
  '!=': op.ne,
  '<': op.lt,
  '>': op.gt,
  '<=': op.le,
  '>=': op.ge,
};

const PREFER_FRAG_JOINS = false;

// Registered pattern implementations.
const PATTERNS = {
  hopWithField: HopWithFieldPattern,
  // More patterns will be added here as they are ported
};
//#endregion

//#region Helper functions
function getPlanSource(plan) {
  return op
    .toSource(plan.export ? plan.export() : plan)
    .replace(/\n\s*/g, ' ')
    .replace(/"/g, "'");
}

function validateMultiScopeCriteria(planCriteria, topLevel, allowMultiScope) {
  if (!topLevel || !allowMultiScope) {
    throw new InvalidSearchRequestError(
      "search scope of 'multi' not supported by this operation or level.",
    );
  }

  if (!planCriteria?.OR || !utils.isArray(planCriteria.OR)) {
    throw new InvalidSearchRequestError(
      "a search with scope 'multi' must contain an 'OR' array.",
    );
  }

  // TODO: Make sure an empty OR array is caught by the generic check of not enough criteria.
  planCriteria.OR.forEach((branch, idx) => {
    const branchScope = branch?._scope;
    if (
      !branchScope ||
      !isSearchScopeName(branchScope) ||
      branchScope === 'multi'
    ) {
      throw new InvalidSearchRequestError(
        `Invalid criteria: OR branch ${idx} in '_scope: multi' must declare a valid non-multi _scope.`,
      );
    }
  });
}

function getCriteriaAndLogicType(planCriteria) {
  // Create a mutuable array of criteria and determine the logic type (AND, OR, NOT)
  // based on the keys of the planCriteria object.
  let criteria;
  let logicType;
  if (planCriteria.AND) {
    criteria = xdmp.toJSON(planCriteria.AND).toObject();
    logicType = 'and';
  } else if (planCriteria.OR) {
    criteria = xdmp.toJSON(planCriteria.OR).toObject();
    // An OR with one criterion should be treated as an AND to avoid incorrect full outer joins.
    logicType = criteria.length === 1 ? 'and' : 'or';
  } else if (planCriteria.NOT) {
    const notCriteria = xdmp.toJSON(planCriteria.NOT).toObject();
    criteria = notCriteria.length === 1 ? [notCriteria[0]] : notCriteria;
    logicType = 'not';
  } else {
    // Single criteria are equivalent to AND
    criteria = [xdmp.toJSON(planCriteria).toObject()];
    logicType = 'and';
  }
  return {
    criteria,
    logicType,
  };
}

// TODO: somewhere herein we should validate the term has any properties required by the pattern.
function buildLeafTermContext({
  criterion,
  id,
  name,
  scope,
  iriCol,
  uriCol,
  fragCol,
  dataTypeCol,
}) {
  const termConfig = new SearchTermConfig(getSearchTermConfig(scope, name));
  DEBUG.push('Found Term Config');
  DEBUG.push(xdmp.toJSON(termConfig.rawConfig));

  const searchTerm = new SearchTerm()
    .addId(id)
    .addName(name)
    .addScopeName(scope)
    .addSearchTermConfig(termConfig)
    .addParentColumns({ iriCol, uriCol, fragCol, dataTypeCol })
    .addChildCriteria(criterion[name]);

  // Runtime search term properties are represented with leading underscores on criteria.
  Object.keys(criterion)
    .filter((k) => k.startsWith('_'))
    .forEach((k) => {
      searchTerm.addProperty(k.substring(1), criterion[k]);
    });

  // Cast value to the correct type if scalar and not dateTime.
  const scalarType = termConfig.getScalarType();
  const caster =
    scalarType && scalarType !== 'dateTime' ? xs[scalarType] : null;
  const rawTermValue = searchTerm.getChildCriteria();
  const value = caster
    ? caster(rawTermValue)
    : typeof rawTermValue === 'string'
      ? rawTermValue
      : null;
  searchTerm.setValue(value);
  DEBUG.push(value);
  DEBUG.push(typeof value);

  // TODO: resolve search options: pattern --> term config --> term instance.
  const searchOptions = termConfig.isForceExactMatch()
    ? DEFAULT_SEARCH_OPTIONS_EXACT
    : DEFAULT_SEARCH_OPTIONS_KEYWORD;
  searchTerm.setSearchOptions(searchOptions);

  return searchTerm;
}
//#endregion

//#region Entry points
// returns {
//   results: Array<object> | null,
//   planAsJson: object,
//   planAsSource: string,
//   debug: Array<string>,
// }
//
// TODO: implement 'values' mode for related lists (i.e., array of IRIs).
// TODO: verify multi-scope searches are supported.
// TODO: verify semantic sort is supported and SEMANTIC_SORT_TIMEOUT is imposed.
// TODO: implement pageWith functionality with MAXIMUM_PAGE_WITH_LENGTH = 100000;
function performSearch({
  searchCriteriaProcessor,
  searchCriteria,
  searchScope,
  requestOptions,
  allowMultiScope,
  includeResults = true,
}) {
  try {
    // We need to group by uri because lexicons can hit multiple times in a doc
    const finalGroups = {
      by: ['uri'],
      agg: [op.sample('dataType', op.col('dataType'))],
    };

    const opticPlan = processCriteria({
      searchCriteriaProcessor,
      planCriteria: searchCriteria,
      planScope: searchScope,
      allowMultiScope,
      groups: finalGroups,
      requestOptions,
    });

    const planAsJson = opticPlan.export();

    return {
      results: includeResults ? opticPlan.result().toArray() : null,
      planAsJson,
      planAsSource: 'TODO: temporarily disabled', //getPlanSource(planAsJson),
      debug: DEBUG,
    };
  } catch (ex) {
    console.dir(DEBUG);
    throw ex;
  }
}

function processCriteria({
  searchCriteriaProcessor,
  planCriteria,
  planScope = 'item',
  patternOptions,
  groups = null,
  parentId = null,
  allowMultiScope = false,
  requestOptions = null,
}) {
  DEBUG.push('Called processCriteria');

  if (!utils.isDefined(patternOptions)) {
    patternOptions = new PatternOptions(PREFER_FRAG_JOINS);
  }

  DEBUG.push(
    xdmp.toJSON({
      planCriteria,
      planScope,
      patternOptions,
      parentId,
      allowMultiScope,
      requestOptions,
    }),
  );

  const topLevel = !parentId;
  const uriCol = topLevel ? 'uri' : parentId + '_uri'; // If this isn't the root criteria, it needs to be joined back
  const fragCol = topLevel ? 'frag' : parentId + '_frag'; // Joining on frag can result in different plans (more D-Node pushdown)
  const iriCol = topLevel ? 'iri' : parentId + '_iri'; // IRI is used for semantic hops
  const dataTypeCol = topLevel ? 'dataType' : parentId + '_dataType';

  if (!utils.isDefined(planCriteria)) {
    throw new InvalidSearchRequestError('search criteria must be defined.');
  }

  let scope = topLevel ? (planCriteria._scope ?? planScope) : planScope;

  const isMultiScope = scope === 'multi';
  if (isMultiScope) {
    validateMultiScopeCriteria(planCriteria, topLevel, allowMultiScope);
  }

  // Search terms are keys that don't start with '_' and exist in searchTermsConfig.mjs.
  // For multi-scope, each top-level OR criterion resolves terms against its own scope.
  let searchTermNames = isMultiScope ? null : getSearchTermNames(scope);

  // Queries always return URIs and dataType so we start from these lexicons.  This may be optimized differently for different queries later.
  // I will note where additional indexes were added in comments so they can be moved into the DB config later.
  // I am using Range Path Indexes for this so they can be easily found and because Optic needs range indexes, but Fields can be used if desired as long as a range index is assigned.
  const lexicons = {
    [uriCol]: cts.uriReference(),
    [iriCol]: cts.iriReference(),
    [dataTypeCol]: cts.fieldReference('anyDataTypeName'),
    // TODO: if wanted, must configure as field range indexes
    // primaryName: cts.fieldReference(scope + 'PrimaryName')
  };

  // Conjunction joins: from the 3×3 matrix (AND/OR/NOT encountering child AND/OR/NOT).
  // Type is determined eagerly because the matrix has non-trivial mappings.
  // { type: string, right: plan, on: op.on(...), condition: op.eq(...) }
  const conjunctionJoins = [];

  // Pattern joins: from leaf patterns (hopWithField, annTopK) that need their own
  // row source. Type is deferred to assembly — always a simple function of logicType.
  // { right: plan, on: joinCondition, extraCols: string[] }
  let patternJoins = [];

  // Some constraints are more efficient when combined, so we track them here to assemble later
  let constraints = isMultiScope
    ? []
    : [
        // It's possible to conditionally omit the dataType constraint but we'd have to define those
        // conditions to ensure records from other search scopes do not leak in, and might as well
        // keep this until proven to take from performance.
        op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false)),
      ];

  // CTS constraints may need to be AND, OR, or NOT(OR) depending on the context, so build them separately;
  let ctsConstraints = [];

  // Names of distance columns added by annTopK criteria at this plan level.
  // Propagated to execute() so they can be preserved through groupBy.
  let distanceCols = [];

  const addToPlanArrays = (termPlanArrays) => {
    constraints = constraints.concat(termPlanArrays?.constraints ?? []);
    ctsConstraints = ctsConstraints.concat(
      termPlanArrays?.ctsConstraints ?? [],
    );
    patternJoins = patternJoins.concat(termPlanArrays?.patternJoins ?? []);
    distanceCols = distanceCols.concat(termPlanArrays?.distanceCols ?? []);
  };

  const criteriaAndLogicType = getCriteriaAndLogicType(planCriteria);
  const criteria = criteriaAndLogicType.criteria;
  const logicType = criteriaAndLogicType.logicType;

  DEBUG.push(`Logic Type: ${logicType}`);

  // Loop through search criteria, adding operators
  for (let idx = 0; idx < criteria.length; idx++) {
    let criterion = criteria[idx];
    DEBUG.push(`Processing Criterion ${idx}`);
    DEBUG.push(xdmp.toJSON(criterion));

    if (isMultiScope) {
      scope = criterion._scope;
      searchTermNames = getSearchTermNames(scope);
    }

    // Used when creating a new column that needs to be joined or filtered.
    const id = sem.uuidString().replace(/-/g, '_');

    // If the criterion is a nested conjunction, handle it recursively
    if (criterion.AND) {
      switch (logicType) {
        case 'and':
          // AND can be inlined because we're already in an AND here
          criteria.push(...criterion.AND);
          break;

        case 'or':
          // We are in an OR and encounter an AND - full outer join
          // Full outer joins need the same columns from both sides
          // This will result in a natural join

          const _joinCol = patternOptions.getPreferFragJoins()
            ? op.as(fragCol, op.fragmentIdCol(id + '_frag'))
            : op.as(uriCol, op.col(id + '_uri'));

          conjunctionJoins.push({
            type: 'joinFullOuter',
            right: processCriteria({
              searchCriteriaProcessor,
              planCriteria: criterion,
              planScope: scope,
              patternOptions,
              parentId: id,
            }).select([_joinCol, op.as('dataType', op.col(id + '_dataType'))]),
            on: null,
            condition: null,
          });
          break;

        case 'not':
          // We are in a NOT and encounter an AND - not exists join
          conjunctionJoins.push({
            type: 'notExistsJoin',
            right: processCriteria({
              searchCriteriaProcessor,
              planCriteria: criterion,
              planScope: scope,
              patternOptions,
              parentId: id,
            }).select(
              patternOptions.getPreferFragJoins()
                ? [id + '_frag']
                : [id + '_uri'],
            ),
            on: patternOptions.getPreferFragJoins()
              ? op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol(id + '_frag'))
              : op.on(op.col(uriCol), op.col(id + '_uri')),
            condition: null,
          });
          break;
      }
      continue;
    }

    if (criterion.OR) {
      switch (logicType) {
        case 'and':
          // We are in an AND and encounter an OR - inner join
          conjunctionJoins.push({
            type: 'joinInner',
            right: processCriteria({
              searchCriteriaProcessor,
              planCriteria: criterion,
              planScope: scope,
              patternOptions,
              parentId: id,
            }).select(
              patternOptions.getPreferFragJoins()
                ? [id + '_frag']
                : [id + '_uri'],
            ),
            on: patternOptions.getPreferFragJoins()
              ? op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol(id + '_frag'))
              : op.on(op.col(uriCol), op.col(id + '_uri')),
            condition: null,
          });
          break;

        case 'or':
          // OR can be inlined because we're already in an OR here
          criteria.push(...criterion.OR);
          break;

        case 'not':
          // We are in a NOT and encounter an OR - not exists join
          conjunctionJoins.push({
            type: 'notExistsJoin',
            right: processCriteria({
              searchCriteriaProcessor,
              planCriteria: criterion,
              planScope: scope,
              patternOptions,
              parentId: id,
            }).select(
              patternOptions.getPreferFragJoins()
                ? [id + '_frag']
                : [id + '_uri'],
            ),
            on: patternOptions.getPreferFragJoins()
              ? op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol(id + '_frag'))
              : op.on(op.col(uriCol), op.col(id + '_uri')),
            condition: null,
          });
          break;
      }
      continue;
    }

    if (criterion.NOT) {
      switch (logicType) {
        case 'and':
          // We are in an AND and encounter a NOT - not exists join and change to OR
          // This is equivalent and likely more performant (needs testing)
          conjunctionJoins.push({
            type: 'notExistsJoin',
            right: processCriteria({
              searchCriteriaProcessor,
              planCriteria: { OR: criterion.NOT },
              planScope: scope,
              patternOptions,
              parentId: id,
            }).select(
              patternOptions.getPreferFragJoins()
                ? [id + '_frag']
                : [id + '_uri'],
            ),
            on: patternOptions.getPreferFragJoins()
              ? op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol(id + '_frag'))
              : op.on(op.col(uriCol), op.col(id + '_uri')),
            condition: null,
          });
          break;

        case 'or':
          // We are in an OR and encounter a NOT - full outer join
          // I don't think there's a faster equivalent here, unfortunately
          // Full outer joins need the same columns from both sides
          // This will result in a natural join

          const _joinCol = patternOptions.getPreferFragJoins()
            ? op.as(fragCol, op.fragmentIdCol(id + '_frag'))
            : op.as(uriCol, op.col(id + '_uri'));

          conjunctionJoins.push({
            type: 'joinFullOuter',
            right: processCriteria({
              searchCriteriaProcessor,
              planCriteria: criterion,
              planScope: scope,
              patternOptions,
              parentId: id,
            }).select([_joinCol, op.as('dataType', op.col(id + '_dataType'))]),
            on: null,
            condition: null,
          });
          break;

        case 'not':
          // We are in a NOT and encounter a NOT - inner join and change to OR
          // This is equivalent and likely more performant (needs testing)
          conjunctionJoins.push({
            type: 'joinInner',
            right: processCriteria({
              searchCriteriaProcessor,
              planCriteria: { OR: criterion.NOT },
              planScope: scope,
              patternOptions,
              parentId: id,
            }).select(
              patternOptions.getPreferFragJoins()
                ? [id + '_frag']
                : [id + '_uri'],
            ),
            on: patternOptions.getPreferFragJoins()
              ? op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol(id + '_frag'))
              : op.on(op.col(uriCol), op.col(id + '_uri')),
            condition: null,
          });
          break;
      }
      continue;
    }

    const name = Object.keys(criterion).find(
      (k) => k[0] !== '_' && searchTermNames.includes(k),
    );
    const searchTerm = buildLeafTermContext({
      criterion,
      id,
      name,
      scope,
      iriCol,
      uriCol,
      fragCol,
      dataTypeCol,
    });

    // Delete post-refactor
    criterion = null; // Use searchTerm
    const termValue = searchTerm.getValue();
    const termConfig = searchTerm.getSearchTermConfig();
    const termSearchOptions = searchTerm.getSearchOptions();

    DEBUG.push(
      `Processing the '${termConfig.getPatternName()}' pattern for search term '${name}' with value:`,
    );

    const patternName = termConfig.getPatternName();
    const pattern = PATTERNS[patternName];

    if (pattern) {
      // Ported patterns use the pattern class registry
      addToPlanArrays(
        pattern.apply(
          searchCriteriaProcessor,
          searchTerm,
          patternOptions,
          requestOptions,
        ),
      );
    } else {
      // Legacy patterns still using switch-based dispatch
      switch (patternName) {
        case 'dateRange': {
          let returnLexicons = true;

          // Identify indexes and configure lexicons.
          if (
            !utils.isArray(termConfig.getIndexReferences()) ||
            termConfig.getIndexReferences().length !== 2
          ) {
            throw new InternalServerError(
              `The '${name}' search term within the '${searchTerm.getScopeName()}' scope is not correctly configured: two indexes are required.`,
            );
          }
          const startColName = id + '_start';
          const endColName = id + '_end';

          // Accept two dates, requiring at least one.
          const delim = ';';
          let dates = termValue;
          if (dates.indexOf(delim) === -1) {
            dates += delim;
          }
          dates = dates.split(';');
          let startDateStr = dates[0].length > 0 ? dates[0] : null;
          let endDateStr = dates[1].length > 0 ? dates[1] : null;
          if (!startDateStr && !endDateStr) {
            throw new InvalidSearchRequestError(
              `the '${name} search term requires at least one date, such as '1800;1810', '1800', '1800;', or ';1810' (end of date range only).`,
            );
          }

          if (startDateStr && !endDateStr) {
            endDateStr = startDateStr;
          } else if (!startDateStr && endDateStr) {
            startDateStr = endDateStr;
          }

          // Convert to seconds, allowing the operator to help determine how to treat partial dates.
          const operator = searchTerm.getComparisonOperator();
          const startDateLong = convertPartialDateTimeToSeconds(
            startDateStr,
            true,
          );
          const endDateLong = convertPartialDateTimeToSeconds(
            endDateStr,
            false,
          );

          // TODO: document logic w/ example
          const isBefore = ['<', '>='].includes(operator);
          if (['>', '>=', '<', '<='].includes(operator)) {
            isBefore
              ? constraints.push(
                  COMPARATORS[operator](op.col(startColName), startDateLong),
                )
              : constraints.push(
                  COMPARATORS[operator](op.col(endColName), endDateLong),
                );
          } else if (['='].includes(operator)) {
            constraints.push(op.ge(op.col(startColName), startDateLong));
            constraints.push(op.le(op.col(endColName), endDateLong));
          } else if (['!='].includes(operator)) {
            returnLexicons = false;
            ctsConstraints.push(
              cts.orQuery([
                cts.fieldRangeQuery(
                  termConfig.getIndexReferences()[0],
                  '<',
                  startDateLong,
                ),
                cts.fieldRangeQuery(
                  termConfig.getIndexReferences()[1],
                  '>',
                  endDateLong,
                ),
              ]),
            );
          } else {
            throw new InternalServerError(
              `The date range pattern has not accounted for the '${operator}' operator.`,
            );
          }

          if (returnLexicons) {
            // TODO: allow pattern functions to add to the lexicons object.
            lexicons[startColName] = cts.fieldReference(
              termConfig.getIndexReferences()[0],
            );
            lexicons[endColName] = cts.fieldReference(
              termConfig.getIndexReferences()[1],
            );
          }

          break;
        }
        case 'text': {
          const newCriteria = {
            OR: [
              {
                textNoHop: searchTerm.getChildCriteria(),
              },
              {
                referencedBy: searchTerm.getChildCriteria(),
              },
            ],
          };

          criteria.push(newCriteria);
          break;
        }
        case 'indexedValue': {
          // CTS constraint rather than op.eq on a range lexicon: simple column value
          // comparisons do not support wildcarding, stemming, or sensitivity options
          // (case, whitespace, diacritics, and punctuation).
          //
          // This pattern also subsumed the propertyValue pattern.  Should there be a
          // need to use the universal index, re-instate the propertyValue pattern and
          // use cts.jsonPropertyValueQuery therein.  Dropped support of correcting the
          // case of a dataType, as was done for recordType search terms.
          ctsConstraints.push(
            cts.fieldValueQuery(
              termConfig.getIndexReferences(),
              termValue,
              termSearchOptions,
            ),
          );
          break;
        }
        case 'indexedWord': {
          // CTS constraint for same reason as indexedValue pattern.
          if (searchTerm.isCompleteMatch()) {
            ctsConstraints.push(
              cts.fieldValueQuery(
                termConfig.getIndexReferences(),
                termValue,
                termSearchOptions,
              ),
            );
          } else {
            ctsConstraints.push(
              cts.fieldWordQuery(
                termConfig.getIndexReferences(),
                termValue,
                termSearchOptions,
              ),
            );
          }
          break;
        }
        case 'indexedRange': {
          // NOTE: If we switch to fromView, we can restrict criteria to a single object's values versus
          // including the values of all objects in the array.
          if (logicType === 'and') {
            const constraint = COMPARATORS[searchTerm.getComparisonOperator()];
            // This requires that each term config only has one index reference. This is true today, but is it guaranteed?
            lexicons[id + '_field'] = cts.fieldReference(
              termConfig.getIndexReferences()[0],
            );
            constraints.push(constraint(op.col(id + '_field'), termValue));
          } else {
            // OR and NOT
            ctsConstraints.push(
              cts.fieldRangeQuery(
                termConfig.getIndexReferences(),
                searchTerm.getComparisonOperator(),
                termValue,
              ),
            );
          }
          break;
        }
        case 'hopInverse': {
          const _triFragCol = id + '_triFrag';
          const _refFrag = id + '_frag';
          const predicates = SearchCriteriaProcessor.expandPredicates(
            termConfig.getPredicates(),
          );
          const tri = op.fromTriples([
            op.pattern(
              op.col(id + '_s'),
              predicates,
              op.col(id + '_o'),
              op.fragmentIdCol(_triFragCol),
            ),
          ]);

          const rightGroups = {
            by: [_refFrag],
          };

          const right = tri.joinInner(
            processCriteria({
              searchCriteriaProcessor,
              planCriteria: searchTerm.getChildCriteria(),
              planScope: termConfig.getTargetScopeName(),
              patternOptions,
              groups: rightGroups,
              parentId: id,
            }),
            [
              // Hop Inverse: the triple is on the referenced document, not the source document.
              op.on(op.fragmentIdCol(_triFragCol), op.fragmentIdCol(_refFrag)),
            ],
          );

          // DEBUG.push('Generated right plan:');
          // DEBUG.push(getPlanSource(right));

          patternJoins.push({
            right: right,
            // Can't join on frag because the triple isn't on the source document
            on: op.on(op.col(iriCol), op.col(id + '_o')),
            extraCols: [],
          });
          break;
        }
        // IRIs and URIs are both strings at this point. Using uriCol as it can be processed on the d-nodes.
        case 'documentId':
        case 'iri': {
          if (logicType === 'and') {
            constraints.push(op.eq(op.col(uriCol), termValue));
          } else {
            ctsConstraints.push(cts.documentQuery(termValue));
          }
          break;
        }
        case 'annTopK': {
          const vecFrag = id + '_vecFrag';
          const distCol = id + '_distance';
          const vectorColumn = searchTerm.getVectorColumn();
          const maxDistance = searchTerm.getVectorDistance();
          const k = searchTerm.getAnnK();

          // Require the seed document have the specified vector.
          if (!fn.docAvailable(termValue)) {
            throw new InvalidSearchRequestError(
              `Document specified by search term ${name} is not available: ${termValue}`,
            );
          }
          const vectorData = cts
            .doc(termValue)
            .xpath(`vectors/${vectorColumn}`)
            .toArray();
          if (!vectorData || vectorData.length === 0) {
            throw new InvalidSearchRequestError(
              `Document specified by search term ${name} is missing vector data for column '${vectorColumn}': ${termValue}`,
            );
          }
          const queryVector = vec.vector(vectorData);

          // Create annTopK plan with URI column renamed to avoid conflicts with main lexicons
          // TODO: Replace hardcoded schema and view names.
          let annPlan = op.fromView(
            'lux',
            'vectors',
            id,
            op.fragmentIdCol(vecFrag),
          );

          // Determine if we should exclude seed document - only exclude for single similarity queries
          const isMultipleSimilarity =
            (planCriteria.OR && planCriteria.OR.length > 1) ||
            (criteria.length > 1 && logicType === 'or');

          // Only exclude seed document for single similarity queries
          if (!isMultipleSimilarity) {
            annPlan = annPlan.where(op.ne(op.col('uri'), termValue));
          }

          // annTopK should naturally filter out documents without valid vector data
          annPlan = annPlan
            .annTopK(k, op.col(vectorColumn), queryVector, op.col(distCol), {
              distance: 'cosine',
              'max-distance': maxDistance,
            })

            // Rename uri to avoid conflict, select only needed columns
            .select([
              op.as(id + '_vectorUri', op.col('uri')),
              op.fragmentIdCol(vecFrag),
              distCol,
            ]);

          // annPlan includes the entire vector.
          DEBUG.push('Generated annTopK plan:');
          DEBUG.push(
            `k=${k}, vectorColumn='${vectorColumn}', maxDistance=${maxDistance}, seedURI='${termValue}'`,
          );

          patternJoins.push({
            right: annPlan,
            on: op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol(vecFrag)),
            extraCols: [distCol],
          });

          break;
        }
        default:
          throw new NotImplementedError(
            `Unimplemented pattern name: ${patternName}.`,
          );
      }
    }
  }

  // Optic uses functional programming patterns, so we will assign plan temporarily and replace it with each modification unless/until we need a more complex pattern.
  let plan = op.fromLexicons(lexicons, null, op.fragmentIdCol(fragCol));
  // DEBUG.push('Initial lexicon plan:');
  // DEBUG.push(getPlanSource(plan));

  if (constraints.length) {
    DEBUG.push('Applying Constraints');
    for (const constraint of constraints) {
      DEBUG.push({
        constraint,
      });
      plan = plan.where(constraint);
    }
    // DEBUG.push(getPlanSource(plan));
  }

  if (ctsConstraints.length) {
    DEBUG.push('Applying CTS Constraints');
    const ctsWrapper =
      logicType === 'and'
        ? cts.andQuery
        : logicType === 'or'
          ? cts.orQuery // NOT
          : (x) => cts.notQuery(cts.orQuery(x));

    plan = plan.where(ctsWrapper(ctsConstraints));
    // DEBUG.push(getPlanSource(plan));
  }

  if (conjunctionJoins.length) {
    DEBUG.push('Applying Conjunction Joins');
    for (const join of conjunctionJoins) {
      // DEBUG.push({
      //   type: join.type,
      //   left: getPlanSource(plan),
      //   right: getPlanSource(join.right),
      //   on: join.on?.toString(),
      //   condition: join.condition,
      // });
      // Join functions are a method on the plan, so we have to reference them by name instead of storing the join itself in the array
      plan = plan[join.type](join.right, join.on, join.condition);
    }
    // DEBUG.push(getPlanSource(plan));
  }

  if (patternJoins.length) {
    DEBUG.push('Applying Pattern Joins');

    if (logicType === 'or') {
      const hasNonJoinConstraints =
        constraints.length > 0 ||
        ctsConstraints.length > 0 ||
        conjunctionJoins.length > 0;

      for (let i = 0; i < patternJoins.length; i++) {
        const pj = patternJoins[i];

        if (!hasNonJoinConstraints && i === 0) {
          // No other constraints exist: inner join constrains the base plan
          // instead of outer joining to an unconstrained lexicon scan.
          DEBUG.push(
            'OR first join (inner): no non-join constraints, constraining base plan',
          );
          plan = plan.joinInner(pj.right, pj.on);
        } else {
          // Duplicate lexicon → inner join with right → align columns → full outer join.
          // Select uriCol (not fragCol) so the natural join key matches conjunction
          // joins and the final groupBy(['uri']) sees every matched document.
          DEBUG.push('OR join (full outer via lexicon copy)');
          const wrapped = op
            .fromLexicons(lexicons, null, op.fragmentIdCol(fragCol))
            .joinInner(pj.right, pj.on)
            .where(
              // Apply scope constraint to wrapped plan (same as applied to base plan)
              op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false)),
            )
            .select([uriCol, fragCol, dataTypeCol, ...pj.extraCols]);

          plan = plan.joinFullOuter(wrapped, null);
        }

        distanceCols.push(...pj.extraCols);
      }
    } else if (logicType === 'not') {
      for (const pj of patternJoins) {
        plan = plan.notExistsJoin(pj.right, pj.on);
        // Extra columns not registered — notExistsJoin discards right-side data
      }
    } else {
      // AND
      for (const pj of patternJoins) {
        plan = plan.joinInner(pj.right, pj.on);
        distanceCols.push(...pj.extraCols);
      }
    }

    // DEBUG.push(getPlanSource(plan));
  }

  if (groups) {
    DEBUG.push(`Grouping by ${groups.by ? groups.by.join(', ') : 'none'}...`);
    const agg = distanceCols.length
      ? [
          ...groups.agg,
          ...distanceCols.map((col) => op.sample(col, op.col(col))),
        ]
      : groups.agg;
    plan = plan.groupBy(groups.by, agg);
    // DEBUG.push(getPlanSource(plan));
  }

  // Rename output columns: uri → id, dataType → type.
  // Only at root level — recursive calls use parentId-prefixed column names
  // and the parent join still needs the original columns.
  if (topLevel) {
    const outputCols = [
      op.as('id', op.col('uri')),
      op.as('type', op.col('dataType')),
      // op.as('name', op.col('primaryName'))
    ];

    // Consolidate distance columns using Optic instead of post-processing
    const distanceColCnt = distanceCols.length;
    if (distanceColCnt > 0) {
      DEBUG.push('Consolidating distance columns');

      plan = plan
        .select([
          ...outputCols,
          op.as(
            'distance',
            distanceColCnt === 1
              ? op.col(distanceCols[0])
              : op.fn.min(distanceCols.map((col) => op.col(col))),
          ),
        ])
        .where(op.isDefined(op.col('distance')));
    } else if (groups) {
      // Rename output columns for root-level plans (no distance consolidation)
      plan = plan.select(outputCols);
    }

    DEBUG.push('***********************************FINAL PLAN:');
    DEBUG.push(getPlanSource(plan));
  }

  return plan;
}
//#endregion

export { performSearch, processCriteria };
