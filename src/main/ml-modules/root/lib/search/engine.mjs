'use strict';

//#region Imports
import op from '/MarkLogic/optic.mjs';
import { getSearchScopeTypes, isSearchScopeName } from '../searchScope.mjs';
import * as utils from '../../utils/utils.mjs';
import { FACETS_CONFIG } from '../../config/facetsConfig.mjs';
import {
  getSearchTermNames,
  getSearchTermConfig,
} from '../../config/searchTermsConfig.mjs';
import { convertSecondsToDateStr } from '../../utils/dateUtils.mjs';
import {
  DEFAULT_SEARCH_OPTIONS_EXACT,
  DEFAULT_SEARCH_OPTIONS_KEYWORD,
} from '../appConstants.mjs';
import {
  InvalidSearchRequestError,
  NotImplementedError,
} from '../errorClasses.mjs';
import { FacetResponses } from './FacetResponses.mjs';
import { SearchCriteriaProcessor } from '../SearchCriteriaProcessor.mjs';
import { SearchExecutionResult } from './SearchExecutionResult.mjs';
import { SearchTerm } from './SearchTerm.mjs';
import { SearchTermConfig } from './SearchTermConfig.mjs';
import { PatternOptions } from './patterns.mjs';
import { AnnTopKPattern } from './patterns/AnnTopK.mjs';
import { DateRangePattern } from './patterns/DateRange.mjs';
import { DocumentIdOrIriPattern } from './patterns/DocumentIdOrIri.mjs';
import { GeospatialPattern } from './patterns/Geospatial.mjs';
import { HopInversePattern } from './patterns/HopInverse.mjs';
import { HopWithFieldPattern } from './patterns/HopWithField.mjs';
import { KeywordPattern } from './patterns/Keyword.mjs';
import { IndexedRangePattern } from './patterns/IndexedRange.mjs';
import { IndexedValuePattern } from './patterns/IndexedValue.mjs';
import { IndexedWordPattern } from './patterns/IndexedWord.mjs';
//#endregion

//#region Constants
// Registered patterns.
const PATTERNS = {
  annTopK: AnnTopKPattern,
  dateRange: DateRangePattern,
  documentId: DocumentIdOrIriPattern,
  geospatial: GeospatialPattern,
  hopInverse: HopInversePattern,
  hopWithField: HopWithFieldPattern,
  iri: DocumentIdOrIriPattern,
  indexedRange: IndexedRangePattern,
  indexedValue: IndexedValuePattern,
  indexedWord: IndexedWordPattern,
  keyword: KeywordPattern,
};

const PREFER_FRAG_JOINS = false;
//#endregion

//#region Entry points
// Returns an instance of SearchExecutionResult
//
// TODO: implement 'values' mode for related lists (i.e., array of IRIs).
// TODO: verify semantic sort is supported and SEMANTIC_SORT_TIMEOUT is imposed.
function performSearch({
  searchCriteriaProcessor,
  searchCriteria,
  searchScope,
  requestOptions,
  allowMultiScope,
  page,
  pageLength,
  pageWith,
  facetRequests,
}) {
  let planAsSource;
  try {
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
    planAsSource = getPlanSource(planAsJson);

    const allRows = opticPlan.result().toArray();
    const total = allRows.length;

    // Apply pagination if needed
    // TODO: implement pageWith functionality with MAXIMUM_PAGE_WITH_LENGTH = 100000;
    const finalPage = Math.max(page, 1);
    const finalPageLength = pageLength ?? 20;
    let paginatedSearchResults = allRows;
    if (finalPage > 0 && finalPageLength > 0) {
      const offset = (finalPage - 1) * finalPageLength;
      paginatedSearchResults = allRows.slice(offset, offset + finalPageLength);
    }

    const facetResponses = calculateFacets(allRows, facetRequests);

    return new SearchExecutionResult({
      searchResults: paginatedSearchResults,
      total,
      resultPage: finalPage,
      planAsJson,
      planAsSource,
      facetResponses,
    });
  } catch (ex) {
    console.warn({
      'Error during search execution': ex.message,
      stack: ex.stack,
      plan: planAsSource,
    });
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
  if (!utils.isDefined(patternOptions)) {
    patternOptions = new PatternOptions(PREFER_FRAG_JOINS);
  }

  const topLevel = !parentId;
  const uriCol = topLevel ? 'uri' : parentId + '_uri';
  const fragCol = topLevel ? 'frag' : parentId + '_frag';
  const iriCol = topLevel ? 'iri' : parentId + '_iri';
  const dataTypeCol = topLevel ? 'dataType' : parentId + '_dataType';

  if (!utils.isDefined(planCriteria)) {
    throw new InvalidSearchRequestError('search criteria must be defined.');
  }

  let scope = topLevel ? (planCriteria._scope ?? planScope) : planScope;

  const isMultiScope = scope === 'multi';
  if (isMultiScope) {
    validateMultiScopeCriteria(planCriteria, topLevel, allowMultiScope);
  }

  let searchTermNames = isMultiScope ? null : getSearchTermNames(scope);

  const { criteria, logicType } = getCriteriaAndLogicType(planCriteria);

  const acc = createPlanAccumulator({
    scope,
    uriCol,
    iriCol,
    fragCol,
    dataTypeCol,
    isMultiScope,
  });

  // Loop through search criteria, building the accumulator
  for (let idx = 0; idx < criteria.length; idx++) {
    const criterion = criteria[idx];

    if (isMultiScope) {
      scope = criterion._scope;
      searchTermNames = getSearchTermNames(scope);
    }

    // Used when creating a new column that needs to be joined or filtered.
    const id = sem.uuidString().replace(/-/g, '_');

    // If the criterion is a nested conjunction, resolve it to a join or inline expansion
    if (criterion.AND || criterion.OR || criterion.NOT) {
      const result = buildConjunctionJoin(
        criterion,
        logicType,
        scope,
        patternOptions,
        {
          id,
          uriCol,
          fragCol,
          searchCriteriaProcessor,
        },
      );
      if (result.inlineCriteria) {
        criteria.push(...result.inlineCriteria);
      } else if (result.andOrSubPlan) {
        // Deferred: AND-encounters-OR sub-plans are combined off the outer
        // fragment in assembleOpticPlan to avoid SPARQL fusion when 2+ are
        // chained against the same outer (which silently zeroes results or
        // blows memory). See docs/optic-lessons.md.
        acc.andOrSubPlans.push(result.andOrSubPlan);
      } else {
        acc.conjunctionJoins.push(result.join);
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

    mergeTermPlanContributions(
      acc,
      criteria,
      PATTERNS[searchTerm.getSearchTermConfig().getPatternName()].apply(
        searchCriteriaProcessor,
        searchTerm,
        logicType,
        patternOptions,
        requestOptions,
      ),
    );
  }

  let plan = assembleOpticPlan(acc, {
    fragCol,
    uriCol,
    dataTypeCol,
    scope,
    logicType,
  });

  // Only at root level — recursive calls use parentId-prefixed column names
  // and the parent join still needs the original columns.
  if (topLevel) {
    plan = finalizeRootPlan(plan, acc.distanceCols, groups);
  }

  return plan;
}
//#endregion

//#region Helper functions
function calculateFacets(allRows, facetRequests) {
  if (!facetRequests?.getFacetRequests) {
    return null;
  }

  const requests = facetRequests.getFacetRequests();
  if (!utils.isNonEmptyArray(requests)) {
    return new FacetResponses({});
  }

  const uriList = allRows.map((row) => row.id ?? row.uri).filter(Boolean);
  if (!utils.isNonEmptyArray(uriList)) {
    return new FacetResponses({});
  }

  const page = facetRequests.getPage() ?? 1;
  const pageLength = facetRequests.getPageLength() ?? 20;
  const start = (page - 1) * pageLength;
  const end = page * pageLength;
  const docQuery = cts.documentQuery(uriList);

  const facets = {};
  requests.forEach((request) => {
    const facetName = request?.name;
    if (!utils.isNonEmptyString(facetName) || !FACETS_CONFIG[facetName]) {
      throw new InvalidSearchRequestError(
        `Unsupported facet name: '${facetName}'.`,
      );
    }

    const indexReference = FACETS_CONFIG[facetName].indexReference;
    if (!utils.isNonEmptyString(indexReference)) {
      throw new InvalidSearchRequestError(
        `The '${facetName}' facet is not currently supported for this operation.`,
      );
    }

    const isDateFacet = facetName.endsWith('Date');
    const sort = request?.sort;
    const rows = op
      .fromSearch(docQuery)
      .joinInner(
        op.fromLexicons(
          {
            value: cts.fieldReference(indexReference),
            uri: cts.uriReference(),
          },
          null,
          op.fragmentIdCol('lexFragId'),
        ),
        op.on('fragmentId', 'lexFragId'),
      )
      .orderBy(op.col('value'))
      .groupBy(op.col('value'), op.count('count', 'uri'))
      .orderBy(
        sort === 'desc'
          ? op.desc('value')
          : sort === 'asc'
            ? op.asc('value')
            : op.desc('count'),
      )
      .result()
      .toArray();

    facets[facetName] = {
      totalItems: rows.length,
      facetValues: rows.slice(start, end).map((row) => {
        return {
          value: isDateFacet ? convertSecondsToDateStr(row.value) : row.value,
          count: row.count,
        };
      }),
    };
  });

  return new FacetResponses(facets);
}

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
    logicType = 'or';
  } else if (planCriteria.NOT) {
    criteria = xdmp.toJSON(planCriteria.NOT).toObject();
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

function applyPatternRequirements(searchTerm, termConfig) {
  const patternName = termConfig.getPatternName();
  const pattern = PATTERNS[patternName];

  // Validate that the pattern is registered; throw NotImplementedError if not.
  if (!pattern) {
    throw new NotImplementedError(
      `Unimplemented pattern name: ${patternName}.`,
    );
  }

  // Validate that the search term satisfies all runtime properties required by the pattern.
  const requiredProps = pattern.getRequiredRuntimeSearchTermProperties();
  const missingProps = requiredProps.filter((propName) => {
    const propValue = searchTerm.getProperty(propName);
    return !utils.isNonEmptyString(propValue, true);
  });

  if (missingProps.length) {
    const formattedMissing = missingProps
      .map((propName) => `_${propName}`)
      .join(', ');
    throw new InvalidSearchRequestError(
      `Search term '${searchTerm.getName()}' with pattern '${patternName}' is missing required runtime property(ies): ${formattedMissing}`,
    );
  }
}

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

  applyPatternRequirements(searchTerm, termConfig);

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

  // TODO: resolve search options: pattern --> term config --> term instance.
  const searchOptions = termConfig.isForceExactMatch()
    ? DEFAULT_SEARCH_OPTIONS_EXACT
    : DEFAULT_SEARCH_OPTIONS_KEYWORD;
  searchTerm.setSearchOptions(searchOptions);

  return searchTerm;
}

// Mutable accumulator for all pattern/conjunction contributions during criteria iteration.
// Initialized with scope-level base lexicons and an optional dataType constraint.
function createPlanAccumulator({
  scope,
  uriCol,
  iriCol,
  fragCol,
  dataTypeCol,
  isMultiScope,
}) {
  return {
    lexicons: {
      [uriCol]: cts.uriReference(),
      [iriCol]: cts.iriReference(),
      [dataTypeCol]: cts.fieldReference('anyDataTypeName'),
    },
    constraints: isMultiScope
      ? []
      : [op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false))],
    ctsConstraints: [],
    conjunctionJoins: [],
    // AND-encounters-OR sub-plans deferred until assembleOpticPlan, where
    // 2+ are combined off the outer fragment before being joined back in.
    andOrSubPlans: [],
    patternJoins: [],
    distanceCols: [],
  };
}

// Merges contributions from a pattern application into the accumulator.
// criteriaQueue is the live criteria iteration array; pattern-returned criteria are pushed there
// so they are processed in the same loop iteration pass.
function mergeTermPlanContributions(acc, criteriaQueue, contributions) {
  if (!contributions) {
    return;
  }
  Object.assign(acc.lexicons, contributions.lexicons ?? {});
  if (contributions.criteria?.length) {
    criteriaQueue.push(...contributions.criteria);
  }
  if (contributions.constraints?.length) {
    acc.constraints.push(...contributions.constraints);
  }
  if (contributions.ctsConstraints?.length) {
    acc.ctsConstraints.push(...contributions.ctsConstraints);
  }
  if (contributions.patternJoins?.length) {
    acc.patternJoins.push(...contributions.patternJoins);
  }
  if (contributions.distanceCols?.length) {
    acc.distanceCols.push(...contributions.distanceCols);
  }
}

// Resolves a nested conjunction criterion (AND/OR/NOT-keyed) into either a join descriptor
// or inline criteria to be appended to the processing queue.
// Returns: { join: { type, right, on, condition } } or { inlineCriteria: Array }
function buildConjunctionJoin(
  criterion,
  logicType,
  scope,
  patternOptions,
  { id, uriCol, fragCol, searchCriteriaProcessor },
) {
  const makeJoinOn = () =>
    patternOptions.getPreferFragJoins()
      ? op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol(id + '_frag'))
      : op.on(op.col(uriCol), op.col(id + '_uri'));

  const singleColSelect = () =>
    patternOptions.getPreferFragJoins() ? [id + '_frag'] : [id + '_uri'];

  const fullOuterJoinCol = () =>
    patternOptions.getPreferFragJoins()
      ? op.as(fragCol, op.fragmentIdCol(id + '_frag'))
      : op.as(uriCol, op.col(id + '_uri'));

  const subPlan = (planCriteria) =>
    processCriteria({
      searchCriteriaProcessor,
      planCriteria,
      planScope: scope,
      patternOptions,
      parentId: id,
    });

  if (criterion.AND) {
    switch (logicType) {
      case 'and':
        // AND can be inlined because we're already in an AND here
        return { inlineCriteria: criterion.AND };

      case 'or': {
        // We are in an OR and encounter an AND - full outer join
        const _joinCol = fullOuterJoinCol();
        return {
          join: {
            type: 'joinFullOuter',
            right: subPlan(criterion).select([
              _joinCol,
              op.as('dataType', op.col(id + '_dataType')),
            ]),
            on: null,
            condition: null,
          },
        };
      }

      case 'not':
        // We are in a NOT and encounter an AND - not exists join
        return {
          join: {
            type: 'notExistsJoin',
            right: subPlan(criterion).select(singleColSelect()),
            on: makeJoinOn(),
            condition: null,
          },
        };
    }
  }

  if (criterion.OR) {
    switch (logicType) {
      case 'and': {
        // AND encounters OR. Defer: assembleOpticPlan combines all such
        // sub-plans off the outer fragment first, then joins the combined
        // result to the outer ONCE. Chaining 2+ of these as joinInner
        // against the same outer fragment causes SPARQL fusion that
        // silently zeroes results or blows memory.
        // singleColSelect() projects [id+'_uri'] (or [id+'_frag']); the
        // groupBy on that same column dedupes and adds a materialization
        // barrier so the merger sees a single, fully-typed binding.
        const cols = singleColSelect();
        return {
          andOrSubPlan: {
            plan: subPlan(criterion).select(cols).groupBy(cols, []),
            joinCol: cols[0],
            preferFrag: patternOptions.getPreferFragJoins(),
          },
        };
      }

      case 'or':
        // OR can be inlined because we're already in an OR here
        return { inlineCriteria: criterion.OR };

      case 'not':
        // We are in a NOT and encounter an OR - not exists join
        return {
          join: {
            type: 'notExistsJoin',
            right: subPlan(criterion).select(singleColSelect()),
            on: makeJoinOn(),
            condition: null,
          },
        };
    }
  }

  if (criterion.NOT) {
    switch (logicType) {
      case 'and':
        // We are in an AND and encounter a NOT - not exists join and change to OR
        // This is equivalent and likely more performant (needs testing)
        return {
          join: {
            type: 'notExistsJoin',
            right: subPlan({ OR: criterion.NOT }).select(singleColSelect()),
            on: makeJoinOn(),
            condition: null,
          },
        };

      case 'or': {
        // We are in an OR and encounter a NOT - full outer join
        const _joinCol = fullOuterJoinCol();
        return {
          join: {
            type: 'joinFullOuter',
            right: subPlan(criterion).select([
              _joinCol,
              op.as('dataType', op.col(id + '_dataType')),
            ]),
            on: null,
            condition: null,
          },
        };
      }

      case 'not':
        // We are in a NOT and encounter a NOT - inner join and change to OR
        // This is equivalent and likely more performant (needs testing)
        return {
          join: {
            type: 'joinInner',
            right: subPlan({ OR: criterion.NOT }).select(singleColSelect()),
            on: makeJoinOn(),
            condition: null,
          },
        };
    }
  }
}

// Assembles the Optic plan by applying all accumulated constraints, CTS queries, and joins.
function assembleOpticPlan(
  acc,
  { fragCol, uriCol, dataTypeCol, scope, logicType },
) {
  let plan = op.fromLexicons(acc.lexicons, null, op.fragmentIdCol(fragCol));

  if (acc.constraints.length) {
    for (const constraint of acc.constraints) {
      plan = plan.where(constraint);
    }
  }

  if (acc.ctsConstraints.length) {
    const ctsWrapper =
      logicType === 'and'
        ? cts.andQuery
        : logicType === 'or'
          ? cts.orQuery
          : (x) => cts.notQuery(cts.orQuery(x));
    plan = plan.where(ctsWrapper(acc.ctsConstraints));
  }

  if (acc.conjunctionJoins.length) {
    for (const join of acc.conjunctionJoins) {
      // Join functions are a method on the plan, so we reference them by name
      plan = plan[join.type](join.right, join.on, join.condition);
    }
  }

  // Fold AND-encounters-OR sub-plans. With 2+ such sub-plans, chaining each
  // as joinInner against the outer fragment triggers SPARQL fusion that
  // breaks the result. Instead, combine the sub-plans to each other first
  // (off the outer) on their per-branch-unique join columns, then join the
  // combined plan to the outer once.
  if (acc.andOrSubPlans.length) {
    const first = acc.andOrSubPlans[0];
    const mkOn = (leftName, rightName, preferFrag) =>
      preferFrag
        ? op.on(op.fragmentIdCol(leftName), op.fragmentIdCol(rightName))
        : op.on(op.col(leftName), op.col(rightName));

    let combined = first.plan;
    for (let i = 1; i < acc.andOrSubPlans.length; i++) {
      const sp = acc.andOrSubPlans[i];
      combined = combined.joinInner(
        sp.plan,
        mkOn(first.joinCol, sp.joinCol, first.preferFrag),
      );
    }
    const outerLeft = first.preferFrag ? fragCol : uriCol;
    plan = plan.joinInner(
      combined,
      mkOn(outerLeft, first.joinCol, first.preferFrag),
    );
  }

  if (acc.patternJoins.length) {
    const hasNonJoinConstraints =
      acc.constraints.length > 1 || // more than the dataType constraint.
      acc.ctsConstraints.length > 0 ||
      acc.conjunctionJoins.length > 0;

    if (logicType === 'or') {
      for (let i = 0; i < acc.patternJoins.length; i++) {
        const pj = acc.patternJoins[i];
        if (!hasNonJoinConstraints && i === 0) {
          // No other constraints exist: inner join constrains the base plan
          // instead of outer joining to an unconstrained lexicon scan.
          plan = plan.joinInner(pj.right, pj.on);
        } else {
          // Duplicate lexicon → inner join with right → align columns → full outer join.
          // Select uriCol (not fragCol) so the natural join key matches conjunction
          // joins and the final groupBy(['uri']) sees every matched document.
          const wrapped = op
            .fromLexicons(acc.lexicons, null, op.fragmentIdCol(fragCol))
            .joinInner(pj.right, pj.on)
            .where(
              op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false)),
            )
            .select([uriCol, fragCol, dataTypeCol, ...pj.extraCols]);
          plan = plan.joinFullOuter(wrapped, null);
        }
        acc.distanceCols.push(...pj.extraCols);
      }
    } else if (logicType === 'not') {
      for (const pj of acc.patternJoins) {
        plan = plan.notExistsJoin(pj.right, pj.on);
        // Extra columns not registered — notExistsJoin discards right-side data
      }
    } else {
      // AND
      for (const pj of acc.patternJoins) {
        plan = plan.joinInner(pj.right, pj.on);
        acc.distanceCols.push(...pj.extraCols);
      }
    }
  }

  return plan;
}

// Applies root-level output transformations: groupBy, column renames (uri→id, dataType→type),
// and distance column consolidation.
//
// NOTE: groups processing is co-located here because both are root-only concerns today.
// If recursive calls ever need to specify groups, groups processing would need to move
// back into processCriteria (or a separate function) so it can execute independently of
// the root-level column renames and distance consolidation.
function finalizeRootPlan(plan, distanceCols, groups) {
  if (groups) {
    const agg = distanceCols.length
      ? [
          ...groups.agg,
          ...distanceCols.map((col) => op.sample(col, op.col(col))),
        ]
      : groups.agg;
    plan = plan.groupBy(groups.by, agg);
  }

  const outputCols = [
    op.as('id', op.col('uri')),
    op.as('type', op.col('dataType')),
  ];

  const distanceColCnt = distanceCols.length;
  if (distanceColCnt > 0) {
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
    plan = plan.select(outputCols);
  }

  return plan;
}
//#endregion

export {
  // Export for unit testing:
  // assembleOpticPlan,
  // buildConjunctionJoin,
  // createPlanAccumulator,
  // finalizeRootPlan,
  // mergeTermPlanContributions,
  performSearch,
  processCriteria,
};
