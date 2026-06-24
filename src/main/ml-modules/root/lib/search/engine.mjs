'use strict';

//#region Imports
import op from '/MarkLogic/optic.mjs';
import { getSearchScopeTypes } from '../searchScope.mjs';
import * as utils from '../../utils/utils.mjs';
import { FACETS_CONFIG } from '../../config/facetsConfig.mjs';
import { SEMANTIC_FACETS_CONFIG } from '../../config/semanticFacetsConfig.mjs';
import { isSemanticFacet } from '../facetsLib.mjs';
import { convertSecondsToDateStr } from '../../utils/dateUtils.mjs';
import {
  SEARCH_PAGE_SLICE_ENABLED,
  SEMANTIC_SORT_TIMEOUT,
} from '../appConstants.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
} from '../errorClasses.mjs';
import { FacetResponses } from './FacetResponses.mjs';
import { SearchExecutionResult } from './SearchExecutionResult.mjs';
import { tryExecuteKeywordPageSlice } from './keywordPageSlice.mjs';
import { SearchPatternBase } from './patterns/loadPatterns.mjs';
import { expandPredicate } from './prefixUtils.mjs';
import { NODE_TYPE_GROUP } from './criteriaNodes.mjs';
import { analyzeCriteria } from './analyzeCriteria.mjs';
//#endregion

//#region Constants
const MAXIMUM_PAGE_WITH_LENGTH = 100000;

// Accumulator buckets that carry "content" (real plan contributions).
// Keep in sync with createPlanAccumulator. Used by accContainsOnly to answer
// shape questions about the accumulator without each caller re-listing every
// bucket name (which becomes WET and outdated when a new bucket is added).
const ACC_CONTENT_BUCKETS = [
  'constraints',
  'ctsConstraints',
  'conjunctionJoins',
  'andOrSubPlans',
  'patternJoins',
];
//#endregion

//#region Exported functions
// Returns an instance of SearchExecutionResult
function performSearch(scp) {
  const searchCriteria = scp.getSearchCriteria();
  const searchScope = scp.getSearchScope();
  const allowMultiScope = scp.isAllowMultiScope();
  const page = scp.getPage();
  const pageLength = scp.getPageLength();
  const includeSearchResults = scp.getIncludeSearchResults();
  const facetRequests = scp.getFacetRequests();
  let patternOptions = scp.getPatternOptions();

  let planAsSource;
  try {
    let searchResults = [];
    let total = -1;
    let resultPage = -1;
    let planAsJson = null;
    let facetResponses = null;

    // Require the caller want search results or at least one facet before
    // doing any work.
    if (includeSearchResults || facetRequests?.length > 0) {
      // Facet-only requests use the unsorted plan and never need relevance
      // scores. Clearing sort criteria prevents assemblePlan from injecting
      // op.fromSearch (via the areScoresRequired check) and prevents
      // buildSortedResultsPlan from doing any sort-branch work.
      if (!includeSearchResults) {
        scp.setSortCriteria(null);
      }

      // Run analysis once (Pass 1). The result is used for both page-slice
      // eligibility and — if the page-slice path is not taken — plan
      // construction (Pass 2).
      const analysis = analyzeCriteria({
        scp,
        planCriteria: searchCriteria,
        planScope: searchScope,
        allowMultiScope,
      });

      // Simple-keyword queries can bypass the Optic pipeline entirely
      // (cts.search → top-K → hydrate dataType). Returns null when the
      // request is not eligible; see lib/search/keywordPageSlice.mjs.
      const pageSlice = SEARCH_PAGE_SLICE_ENABLED
        ? tryExecuteKeywordPageSlice(scp, (_scp) =>
            getLeafTermsFromAnalysis(analysis),
          )
        : null;
      if (pageSlice) {
        const paginationResult = paginateResults({
          rows: pageSlice.rows,
          pageWith: null, // page-slice path is ineligible when pageWith is set
          page,
          pageLength: pageLength ?? 20,
        });
        return new SearchExecutionResult({
          searchResults: paginationResult.searchResults,
          total: pageSlice.total,
          resultPage: paginationResult.resultPage,
          planAsJson: null,
          planAsSource: '(page-slice: cts.search outside Optic)',
          facetResponses: null,
        });
      }

      const { sortedResultsPlan, unsortedResultsPlan } = buildPlans({
        scp,
        analysis,
        groups: getResultRowGrouping(),
        sortCriteria: scp.getSortCriteria(),
        patternOptions,
      });

      let useThisPlan = includeSearchResults
        ? sortedResultsPlan
        : unsortedResultsPlan;

      // pageWith's limit is imposed here; see paginateResults for the rest.
      const pageWith = scp.getPageWith();
      useThisPlan =
        includeSearchResults && pageWith
          ? useThisPlan.limit(MAXIMUM_PAGE_WITH_LENGTH + 1)
          : useThisPlan;

      planAsJson = useThisPlan.export();
      planAsSource = getPlanSource(planAsJson);

      const rows = useThisPlan.result().toArray();

      if (includeSearchResults) {
        total = rows.length;
        const paginationResult = paginateResults({
          rows,
          pageWith,
          page,
          pageLength: pageLength ?? 20,
        });
        resultPage = paginationResult.resultPage;
        searchResults = paginationResult.searchResults;
      }

      // calculateFacets returns null when facets are not requested.
      facetResponses = calculateFacets(rows, facetRequests);
    }

    return new SearchExecutionResult({
      searchResults,
      total,
      resultPage,
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

// For recursive calls from pattern classes — returns a single assembled plan.
// parentScope: when set, the caller's plan already constrains results to that
// search scope's types. Sub-plans built for the same scope can skip the
// redundant dataType constraint ("empty-groups" optimization).
function processCriteria({
  scp,
  planCriteria,
  planScope = 'item',
  patternOptions,
  groups = null,
  parentId = null,
  parentScope = null,
  allowMultiScope = false,
}) {
  const analysis = analyzeCriteria({
    scp,
    planCriteria,
    planScope,
    parentId,
    parentScope,
    allowMultiScope,
  });
  const { acc, assemblyContext } = buildAccumulatorFromIR({
    scp,
    analysis,
    patternOptions,
    parentScope,
  });
  return assemblePlan(scp, { ...acc, ...assemblyContext });
}

// Like processCriteria but returns a bare CTS query when the inner criteria
// resolves to pure CTS constraints (no Optic joins needed). Returns null when
// the criteria requires an Optic plan — caller should fall back to the join path.
// The dataType constraint is intentionally omitted: callers use cts.values to
// resolve matching document IRIs, and the triple predicate already limits which
// scope's documents are valid objects.
function processCriteriaAsCts({
  scp,
  planCriteria,
  planScope = 'item',
  patternOptions,
  parentId = null,
}) {
  const analysis = analyzeCriteria({
    scp,
    planCriteria,
    planScope,
    parentId,
    // Set parentScope = planScope so the accumulator skips the dataType
    // constraint (empty-groups optimization). The caller resolves IRIs via
    // cts.values; the triple predicate already scopes the objects.
    parentScope: planScope,
  });
  const { acc, assemblyContext } = buildAccumulatorFromIR({
    scp,
    analysis,
    patternOptions,
    parentScope: planScope,
  });
  if (!accContainsOnly(acc, 'ctsConstraints')) {
    return null;
  }
  return wrapCtsByLogicType(assemblyContext.logicType, acc.ctsConstraints);
}

// Needed outside the module in support of building the plans without executing them.
function getResultRowGrouping() {
  return {
    by: ['uri'],
    agg: [op.sample('dataType', op.col('dataType'))],
  };
}

// Top-level entry point called from performSearch — returns sorted and
// unsorted plans with finalization and optional sort applied.
// Accepts either a pre-computed analysis result or raw criteria params.
function buildPlans({
  scp,
  analysis: precomputedAnalysis = null,
  planCriteria,
  planScope = 'item',
  patternOptions,
  allowMultiScope = false,
  groups,
  sortCriteria = null,
}) {
  const analysis =
    precomputedAnalysis ??
    analyzeCriteria({
      scp,
      planCriteria,
      planScope,
      allowMultiScope,
    });

  const { acc, assemblyContext } = buildAccumulatorFromIR({
    scp,
    analysis,
    patternOptions,
  });

  // Unsorted plan — used by facets.
  const unsortedResultsPlan = collapseToResultRows(
    assemblePlan(scp, { ...acc, ...assemblyContext }),
    groups,
  );

  const sortedResultsPlan = buildSortedResultsPlan({
    unsortedResultsPlan,
    sortCriteria,
    acc,
    hasScoreContributingCriteria: analysis.hasScoreContributingCriteria,
    assemblyContext,
    scp,
    groups,
  });

  return { sortedResultsPlan, unsortedResultsPlan };
}
//#endregion

//#region Core engine functions — Pass 2 (plan construction from IR)

// Builds the raw plan accumulator by walking the IR tree produced by
// analyzeCriteria (Pass 1). Each leaf node's pattern.apply() is called here;
// conjunction sub-groups are recursively accumulated and assembled into
// sub-plans as needed.
function buildAccumulatorFromIR({
  scp,
  analysis,
  patternOptions,
  parentScope = null,
}) {
  const { ir, scope, isMultiScope } = analysis;
  const { uriCol, fragCol, iriCol, dataTypeCol } = ir.columns;
  const isTopLevel = ir.isTopLevel;
  const logicType = ir.conjunctionType;

  const scopeAlreadyConstrained =
    !isTopLevel && !isMultiScope && parentScope === scope;

  const acc = createPlanAccumulator({
    scope,
    scopeAlreadyConstrained,
    uriCol,
    iriCol,
    fragCol,
    dataTypeCol,
    isMultiScope,
  });

  for (const child of ir.children) {
    if (child.type === NODE_TYPE_GROUP) {
      const result = buildConjunctionFromIR({
        groupNode: child,
        logicType,
        scope,
        patternOptions,
        uriCol,
        fragCol,
        scp,
        parentIsScopeConstrained: !isMultiScope,
      });
      if (result.ctsConstraint) {
        acc.ctsConstraints.push(result.ctsConstraint);
      } else if (result.andOrSubPlan) {
        acc.andOrSubPlans.push(result.andOrSubPlan);
      } else if (result.join) {
        acc.conjunctionJoins.push(result.join);
      }
    } else {
      // Leaf node — call the pattern's apply method.
      const contributions = child.patternInstance.apply(
        scp,
        child.searchTerm,
        logicType,
        patternOptions,
      );
      mergeTermPlanContributions(acc, contributions);
    }
  }

  // Single-branch OR collapse was already handled in Pass 1 (the IR's
  // conjunctionType is 'and' when collapsed). But conjunctionJoins built
  // in Pass 2 may still carry joinFullOuter from pre-collapse state.
  // Re-check and fix up here.
  if (
    logicType === 'and' &&
    acc.conjunctionJoins.length + acc.andOrSubPlans.length === 1
  ) {
    for (const join of acc.conjunctionJoins) {
      if (join.type === 'joinFullOuter') {
        join.type = 'joinInner';
      }
    }
  }

  const assemblyContext = {
    fragCol,
    uriCol,
    dataTypeCol,
    scope,
    logicType,
    isTopLevel,
    hasScoreContributingCriteria: analysis.hasScoreContributingCriteria,
  };
  return { acc, assemblyContext };
}

// Mutable accumulator for all pattern/conjunction contributions during criteria iteration.
// Initialized with scope-level base lexicons and an optional dataType constraint.
function createPlanAccumulator({
  scope,
  scopeAlreadyConstrained = false,
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
    constraints:
      isMultiScope || scopeAlreadyConstrained
        ? []
        : [op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false))],
    ctsConstraints: [],
    conjunctionJoins: [],
    andOrSubPlans: [],
    patternJoins: [],
  };
}

// Merges contributions from a pattern application into the accumulator.
function mergeTermPlanContributions(acc, contributions) {
  if (!contributions) {
    return;
  }
  Object.assign(acc.lexicons, contributions.lexicons ?? {});
  if (contributions.constraints?.length) {
    acc.constraints.push(...contributions.constraints);
  }
  if (contributions.ctsConstraints?.length) {
    acc.ctsConstraints.push(...contributions.ctsConstraints);
  }
  if (contributions.patternJoins?.length) {
    acc.patternJoins.push(...contributions.patternJoins);
  }
}

// Page-slice eligibility check using a pre-computed analysis result.
// Returns { terms, logicType } when eligible, null otherwise.
function getLeafTermsFromAnalysis(analysis) {
  const ir = analysis.ir;
  if (ir.conjunctionType !== 'and') return null;
  if (ir.children.some((c) => c.type === NODE_TYPE_GROUP)) return null;
  const terms = ir.children.map((leaf) => leaf.searchTerm);
  return terms.length > 0 ? { terms, logicType: 'and' } : null;
}

// Lightweight entry point for page-slice eligibility: runs analyzeCriteria
// on the SCP's current criteria/scope and extracts leaf terms when eligible.
// Side effects (criteriaCount, ignoredTerms) fire — callers should treat
// this as the definitive analysis pass.
function analyzeLeafCriteria(scp) {
  const searchCriteria = scp.getSearchCriteria();
  const scopeName = scp.getSearchScope();
  if (!searchCriteria || typeof searchCriteria !== 'object') return null;
  try {
    const analysis = analyzeCriteria({
      scp,
      planCriteria: searchCriteria,
      planScope: scopeName,
    });
    return getLeafTermsFromAnalysis(analysis);
  } catch (_e) {
    return null;
  }
}

// Resolves an IR group node into either a join descriptor, a pure-CTS
// contribution to be folded into the parent's ctsConstraints, or a
// deferred andOrSubPlan.
// Returns: { join: ... } | { andOrSubPlan: ... } | { ctsConstraint: ctsQuery }
function buildConjunctionFromIR({
  groupNode,
  logicType,
  scope,
  patternOptions,
  uriCol,
  fragCol,
  scp,
  parentIsScopeConstrained,
}) {
  const id = groupNode.id;
  const subConjunctionType = groupNode.conjunctionType;

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

  const notExistsJoinDesc = (plan) => ({
    join: {
      type: 'notExistsJoin',
      right: plan.select(singleColSelect()),
      on: makeJoinOn(),
      condition: null,
    },
  });
  const innerJoinDesc = (plan) => ({
    join: {
      type: 'joinInner',
      right: plan.select(singleColSelect()),
      on: makeJoinOn(),
      condition: null,
    },
  });
  const fullOuterJoinDesc = (plan) => ({
    join: {
      type: 'joinFullOuter',
      right: plan.select([
        fullOuterJoinCol(),
        op.as('dataType', op.col(id + '_dataType')),
      ]),
      on: null,
      condition: null,
    },
  });
  const andOrSubPlanDesc = (plan) => {
    const cols = singleColSelect();
    return {
      andOrSubPlan: {
        plan: plan.select(cols).groupBy(cols, []),
        joinCol: cols[0],
        preferFrag: patternOptions.getPreferFragJoins(),
      },
    };
  };

  // Build the sub-accumulator from the IR sub-group and check whether
  // the result can be folded as pure CTS into the parent.
  const buildSubOrFold = (irNode, negateFold = false) => {
    const subAnalysis = {
      ir: irNode,
      scope: irNode.columns ? scope : scope,
      isMultiScope: false,
      hasScoreContributingCriteria: false,
      usableLeafCount: 0,
    };
    const { acc, assemblyContext } = buildAccumulatorFromIR({
      scp,
      analysis: subAnalysis,
      patternOptions,
      parentScope: parentIsScopeConstrained ? scope : null,
    });
    const foldable =
      (logicType === 'and' || logicType === 'or') &&
      accContainsOnly(acc, 'ctsConstraints');
    if (foldable) {
      const wrapLogic = negateFold ? 'not' : assemblyContext.logicType;
      return {
        ctsConstraint: wrapCtsByLogicType(wrapLogic, acc.ctsConstraints),
      };
    }
    return { plan: assemblePlan(scp, { ...acc, ...assemblyContext }) };
  };

  // The 3×3 logic matrix, using the pre-analyzed IR group node.
  // AND-in-AND and OR-in-OR inlining is normally handled during Pass 1
  // (the children were flattened into the parent's IR children array).
  // However, the single-branch OR→AND collapse can re-introduce same-type
  // nesting post-factum, so Pass 2 handles all nine combinations.
  if (subConjunctionType === 'and') {
    switch (logicType) {
      case 'and': {
        const sub = buildSubOrFold(groupNode);
        return sub.plan ? innerJoinDesc(sub.plan) : sub;
      }
      case 'or': {
        const sub = buildSubOrFold(groupNode);
        return sub.plan ? fullOuterJoinDesc(sub.plan) : sub;
      }
      case 'not': {
        const sub = buildSubOrFold(groupNode);
        return sub.plan ? notExistsJoinDesc(sub.plan) : sub;
      }
    }
  } else if (subConjunctionType === 'or') {
    switch (logicType) {
      case 'and': {
        const sub = buildSubOrFold(groupNode);
        return sub.plan ? andOrSubPlanDesc(sub.plan) : sub;
      }
      case 'or': {
        const sub = buildSubOrFold(groupNode);
        return sub.plan ? fullOuterJoinDesc(sub.plan) : sub;
      }
      case 'not': {
        const sub = buildSubOrFold(groupNode);
        return sub.plan ? notExistsJoinDesc(sub.plan) : sub;
      }
    }
  } else if (subConjunctionType === 'not') {
    switch (logicType) {
      case 'and': {
        // NOT-in-AND → notExistsJoin on { OR: child.NOT } rewrite.
        // The IR node already has the NOT's children; we reinterpret it
        // as an OR group for the sub-plan build, then negate the fold.
        const orRewrite = {
          ...groupNode,
          conjunctionType: 'or',
        };
        const sub = buildSubOrFold(orRewrite, true);
        return sub.plan ? notExistsJoinDesc(sub.plan) : sub;
      }
      case 'or': {
        const sub = buildSubOrFold(groupNode);
        return sub.plan ? fullOuterJoinDesc(sub.plan) : sub;
      }
      case 'not': {
        // NOT-in-NOT → double negation → innerJoin on { OR: child.NOT }.
        const orRewrite = {
          ...groupNode,
          conjunctionType: 'or',
        };
        const sub = buildSubOrFold(orRewrite);
        return sub.plan ? innerJoinDesc(sub.plan) : sub;
      }
    }
  }

  throw new InternalServerError(
    `buildConjunctionFromIR: unhandled combination logicType=${logicType}, subConjunctionType=${subConjunctionType}`,
  );
}

// Wraps an array of cts queries per logicType, matching the convention used
// in assemblePlan for top-level ctsConstraints (NOT → notQuery(orQuery(...))).
function wrapCtsByLogicType(logicType, ctsConstraints) {
  if (logicType === 'and') return cts.andQuery(ctsConstraints);
  if (logicType === 'or') return cts.orQuery(ctsConstraints);
  return cts.notQuery(cts.orQuery(ctsConstraints));
}

// Assembles the Optic plan by applying all accumulated constraints, CTS queries, and joins.
function assemblePlan(
  scp,
  {
    lexicons,
    constraints,
    ctsConstraints,
    conjunctionJoins,
    andOrSubPlans,
    patternJoins,
    fragCol,
    uriCol,
    dataTypeCol,
    scope,
    logicType,
    isTopLevel,
    hasScoreContributingCriteria = false,
  },
) {
  let plan = op.fromLexicons(lexicons, null, op.fragmentIdCol(fragCol));

  if (constraints.length) {
    for (const constraint of constraints) {
      plan = plan.where(constraint);
    }
  }

  if (ctsConstraints.length) {
    const ctsQuery = wrapCtsByLogicType(logicType, ctsConstraints);
    // TODO, FUNC: Scores are only requested for top-level plans. Consider
    // whether sub-plan scores should contribute to the final relevance ranking.
    const wantScore =
      isTopLevel &&
      hasScoreContributingCriteria &&
      scp.getSortCriteria()?.areScoresRequired();
    if (wantScore) {
      // Use op.fromSearch to obtain the score column for relevance sorting.
      // Only done at the top level; sub-plans use plan.where to avoid
      // 'fragmentId'/'score' column collisions when joined back in.
      const searchPlan = op.fromSearch(ctsQuery, null, null, {
        scoreMethod: 'logtfidf',
      });
      plan = plan.joinInner(
        searchPlan,
        op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol('fragmentId')),
      );
    } else {
      plan = plan.where(ctsQuery);
    }
  }

  if (conjunctionJoins.length) {
    for (const join of conjunctionJoins) {
      // Join functions are a method on the plan, so we reference them by name
      plan = plan[join.type](join.right, join.on, join.condition);
    }
  }

  // Fold AND-encounters-OR sub-plans. With 2+ such sub-plans, chaining each
  // as joinInner against the outer fragment triggers SPARQL fusion that
  // breaks the result. Instead, combine the sub-plans to each other first
  // (off the outer) on their per-branch-unique join columns, then join the
  // combined plan to the outer once.
  if (andOrSubPlans.length) {
    const first = andOrSubPlans[0];
    const mkOn = (leftName, rightName, preferFrag) =>
      preferFrag
        ? op.on(op.fragmentIdCol(leftName), op.fragmentIdCol(rightName))
        : op.on(op.col(leftName), op.col(rightName));

    let combined = first.plan;
    for (let i = 1; i < andOrSubPlans.length; i++) {
      const sp = andOrSubPlans[i];
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

  if (patternJoins.length) {
    const hasNonJoinConstraints =
      constraints.length > 1 || // more than the dataType constraint.
      ctsConstraints.length > 0 ||
      conjunctionJoins.length > 0;

    if (logicType === 'or') {
      for (let i = 0; i < patternJoins.length; i++) {
        const pj = patternJoins[i];
        if (!hasNonJoinConstraints && i === 0) {
          // No other constraints exist: inner join constrains the base plan
          // instead of outer joining to an unconstrained lexicon scan.
          plan = plan.joinInner(pj.right, pj.on);
        } else {
          // Duplicate lexicon → inner join with right → align columns → full outer join.
          // Select uriCol (not fragCol) so the natural join key matches conjunction
          // joins and the final groupBy(['uri']) sees every matched document.
          const wrapped = op
            .fromLexicons(lexicons, null, op.fragmentIdCol(fragCol))
            .joinInner(pj.right, pj.on)
            .where(
              op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false)),
            )
            .select([uriCol, fragCol, dataTypeCol, ...pj.extraCols]);
          plan = plan.joinFullOuter(wrapped, null);
        }
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
      }
    }
  }

  return plan;
}

/**
 * Applies root-level output transformations: groupBy, column renames
 * (uri→id, dataType→type), and optional orderBy.
 *
 * Distance column support was removed as it was not based on finalized requirements.
 * To re-add: (1) track pj.extraCols from patternJoins into a distanceCols array during
 * assemblePlan, (2) include each in groupBy aggregation via op.sample, and
 * (3) consolidate into a single 'distance' output column in the select (use op.fn.min
 * for multiple distance sources, filter with op.isDefined).
 *
 * @param {object} plan - The raw Optic plan to finalize.
 * @param {object} groups - `{ by, agg }` descriptors for groupBy; null to skip grouping.
 * @param {Array} sortAggregates - Aggregate expressions (e.g. `op.max`) or column name
 *   strings appended to the groupBy aggregation list. May contain types that are NOT
 *   valid in select() (such as `op.max`).
 * @param {Array} sortOrderBy - Column ordering descriptors (e.g. `op.desc(col)`) passed
 *   to orderBy.
 * @param {Array} sortSelectCols - Column references included in the final select().
 *   Defaults to `sortAggregates`, which works when the aggregates are plain column name
 *   strings. Must be overridden when `sortAggregates` contains aggregate functions
 *   (e.g. relevance sort passes `['score']` here while `sortAggregates` holds
 *   `[op.max('score', op.col('score'))]`).
 */
function collapseToResultRows(
  plan,
  groups,
  sortAggregates = [],
  sortOrderBy = [],
  sortSelectCols = sortAggregates,
) {
  if (groups) {
    plan = plan.groupBy(groups.by, groups.agg.concat(sortAggregates));
  }

  if (sortOrderBy.length > 0) {
    plan = plan.orderBy(sortOrderBy);
  }

  if (groups) {
    plan = plan.select(
      // Tack on `.concat(sortSelectCols)` to the end of the array to
      // include sort values in output (for testing).
      [op.as('id', op.col('uri')), op.as('type', op.col('dataType'))].concat(
        sortSelectCols, // TODO: remove once satisfied with sort.
      ),
    );
  }

  return plan;
}
//#endregion

//#region Facets
function calculateFacets(rows, facetRequests) {
  if (facetRequests == null || facetRequests.length === 0) {
    return null;
  }

  const requests = facetRequests.getFacetRequests();
  if (!utils.isNonEmptyArray(requests)) {
    return new FacetResponses({});
  }

  const uriList = rows.map((row) => row.id);
  if (!utils.isNonEmptyArray(uriList)) {
    return buildEmptyFacetResponses(requests);
  }

  const page = facetRequests.getPage() ?? 1;
  const pageLength = facetRequests.getPageLength() ?? 20;
  const start = (page - 1) * pageLength;
  const end = page * pageLength;
  const docsPlan = op.fromSearch(cts.documentQuery(uriList));

  const semanticConfigsByFacetName = {};
  requests.forEach((request) => {
    const facetName = request?.name;
    if (isSemanticFacet(facetName)) {
      semanticConfigsByFacetName[facetName] =
        getValidatedSemanticFacetConfig(facetName);
    }
  });

  // Optimization idea: try [plan].facetBy, which is a convenience wrapper for groupToArrays.
  const facets = {};
  requests.forEach((request) => {
    const facetName = request?.name;
    let facetSourcePlan = docsPlan;

    let constraintPlan;
    let joinOn;
    let facetValueColName = 'value';
    let countColName = 'uri';
    // isSemanticFacet throws if neither semantic nor non-semantic facet
    if (isSemanticFacet(facetName)) {
      const semanticConfig = semanticConfigsByFacetName[facetName];
      facetValueColName = semanticConfig.facetValueColName;
      countColName = semanticConfig.constraintJoinColName;
      const sourceJoinColName = semanticConfig.sourceJoinColName;

      if (sourceJoinColName === 'iri') {
        facetSourcePlan = facetSourcePlan.joinInner(
          op.fromLexicons(
            { iri: cts.iriReference() },
            null,
            op.fragmentIdCol('iriFragId'),
          ),
          op.on('fragmentId', 'iriFragId'),
        );
      }

      // Projection barrier helps avoid optimizer paths that can collapse
      // certain semantic joins to zero rows.
      facetSourcePlan = facetSourcePlan.select([sourceJoinColName]);

      constraintPlan = semanticConfig.plan;

      joinOn = op.on(sourceJoinColName, countColName);
    } else {
      const indexReference = FACETS_CONFIG[facetName].indexReference;
      if (!utils.isNonEmptyString(indexReference)) {
        throw new InvalidSearchRequestError(
          `The '${facetName}' facet is not currently supported for this operation.`,
        );
      }

      constraintPlan = op.fromLexicons(
        {
          [facetValueColName]: cts.fieldReference(indexReference),
          [countColName]: cts.uriReference(),
        },
        null,
        op.fragmentIdCol('lexFragId'),
      );
      joinOn = op.on('fragmentId', 'lexFragId');
    }

    const isDateFacet = facetName.endsWith('Date');
    const sort = request?.sort;
    const rows = facetSourcePlan
      .joinInner(constraintPlan, joinOn)
      .orderBy(op.col(facetValueColName))
      .groupBy(op.col(facetValueColName), op.count('count', countColName))
      .orderBy(
        sort === 'desc'
          ? op.desc(facetValueColName)
          : sort === 'asc'
            ? op.asc(facetValueColName)
            : op.desc('count'), // a.k.a. frequency-order
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

function getValidatedSemanticFacetConfig(facetName) {
  const semanticConfig = SEMANTIC_FACETS_CONFIG[facetName];
  const sourceJoinColName = semanticConfig?.sourceJoinColName;
  const constraintJoinColName = semanticConfig?.constraintJoinColName;

  if (!utils.isNonEmptyString(sourceJoinColName)) {
    throw new InternalServerError(
      `Semantic facet '${facetName}' is misconfigured: missing required 'sourceJoinColName'.`,
    );
  }
  if (!utils.isNonEmptyString(constraintJoinColName)) {
    throw new InternalServerError(
      `Semantic facet '${facetName}' is misconfigured: missing required 'constraintJoinColName'.`,
    );
  }

  const planValue = semanticConfig?.plan;
  const validPlanType =
    typeof planValue?.result === 'function' &&
    typeof planValue?.export === 'function';
  if (!validPlanType) {
    throw new InternalServerError(
      `Semantic facet '${facetName}' is misconfigured: 'plan' is required and must be an Optic plan.`,
    );
  }

  return {
    ...semanticConfig,
    sourceJoinColName,
    constraintJoinColName,
  };
}

function buildEmptyFacetResponses(requests) {
  const facets = {};

  requests.forEach((request) => {
    const facetName = request?.name;
    facets[facetName] = {
      totalItems: 0,
      facetValues: [],
    };
  });

  return new FacetResponses(facets);
}
//#endregion

//#region Sort
// Resolves which sort strategy to apply based on sort criteria precedence,
// then builds and returns the sorted plan.
//
// Precedence (first match wins):
//   1. Random — bind a random column to the unsorted plan and order by it.
//   2. Non-semantic — add sort field lexicons, rebuild the plan, order by field values.
//   3. Semantic — hop to related documents via predicate, order by related field value.
//   4. Relevance — join op.fromSearch for scores (requires CTS constraints), order by score.
//   5. Unsorted — return the unsorted plan as-is.
function buildSortedResultsPlan({
  unsortedResultsPlan,
  sortCriteria,
  acc,
  hasScoreContributingCriteria = false,
  assemblyContext,
  scp,
  groups,
}) {
  if (sortCriteria?.isRandomSort()) {
    // Add a random column to the unsorted plan using .bind, then sort by it descending.
    const randomColName = 'randomSortCol';
    const planWithRandom = unsortedResultsPlan.bind(
      op.as(randomColName, op.xdmp.random()),
    );
    return planWithRandom.orderBy(op.desc(op.col(randomColName)));
  }

  if (sortCriteria?.hasNonSemanticSortDescriptors()) {
    const sortAggregates = [];
    const sortOrderBy = [];
    const sortLexicons = {};
    for (const sortDescriptor of sortCriteria.getNonSemanticSortDescriptors()) {
      const sortColName = `sort_${sortDescriptor.indexReference}`;
      sortLexicons[sortColName] = cts.fieldReference(
        sortDescriptor.indexReference,
      );
      sortAggregates.push(sortColName);
      sortOrderBy.push(
        sortDescriptor.order === 'descending'
          ? op.desc(sortColName)
          : op.asc(sortColName),
      );
    }
    const sortAcc = { ...acc, lexicons: { ...acc.lexicons, ...sortLexicons } };
    return collapseToResultRows(
      assemblePlan(scp, { ...sortAcc, ...assemblyContext }),
      groups,
      sortAggregates,
      sortOrderBy,
    );
  }

  if (sortCriteria?.hasSemanticSortOption()) {
    xdmp.setRequestTimeLimit(SEMANTIC_SORT_TIMEOUT);

    const semanticSortOption = sortCriteria.getSemanticSortOption();
    const sortByColName = 'sortByMe';
    const sortByCol = op.col(sortByColName);
    return collapseToResultRows(
      applySemanticSort(
        assemblePlan(scp, { ...acc, ...assemblyContext }),
        semanticSortOption,
        sortByColName,
      ),
      groups,
      [sortByCol],
      [
        semanticSortOption.order === 'descending'
          ? op.desc(sortByCol)
          : op.asc(sortByCol),
      ],
    );
  }

  if (
    sortCriteria?.areScoresRequired() &&
    hasScoreContributingCriteria &&
    acc.ctsConstraints.length > 0
  ) {
    // Relevance sort — use the score column produced by op.fromSearch.
    const scoreColName = 'score';
    // TODO, FUNC: Using op.max to aggregate scores across fragments. Should
    // we use op.sum (rewards matching across multiple fragments) or keep
    // op.max (uses the best-matching fragment's score)?
    const scoreAgg = op.max(scoreColName, op.col(scoreColName));
    return collapseToResultRows(
      assemblePlan(scp, { ...acc, ...assemblyContext }),
      groups,
      [scoreAgg],
      [op.desc(op.col(scoreColName))],
      [scoreColName],
    );
  }

  return unsortedResultsPlan;
}

// Applies a semantic sort to the raw assembled plan. Takes one hop from each search result
// document via the sort binding's predicate to a related document and retrieves the related
// document's field value for sorting. Collapses to one sort value per search result (min for
// ascending, max for descending) so that collapseToResultRows receives one row per uri.
function applySemanticSort(plan, sortOption, sortByColName) {
  const { predicate, indexReference, order } = sortOption;
  const expandedPredicate = expandPredicate(predicate);

  // Projection barrier: narrow to columns needed for the semantic join.
  // Prevents the Optic optimizer from collapsing the semantic join to zero rows
  // (same technique used by semantic facets).
  plan = plan.select(['uri', 'iri', 'dataType']);

  // Triple plan: source document's IRI --(predicate)--> related document's IRI.
  const triplePlan = op.fromTriples([
    op.pattern(op.col('sourceIri'), expandedPredicate, op.col('relatedIri')),
  ]);

  // Join triples to search results. Left outer preserves results with no matching
  // triple (they sort last with null sort values).
  plan = plan.joinLeftOuter(triplePlan, op.on('iri', 'sourceIri'));

  // Get the sort field value from the related document via its IRI.
  const relatedFieldPlan = op.fromLexicons(
    {
      relatedDocIri: cts.iriReference(),
      [sortByColName]: cts.fieldReference(indexReference),
    },
    null,
    op.fragmentIdCol('relatedFragId'),
  );

  plan = plan.joinLeftOuter(
    relatedFieldPlan,
    op.on('relatedIri', 'relatedDocIri'),
  );

  // Collapse to one row per search result, picking the best sort value.
  // A search result with multiple triples (e.g., co-produced items) gets
  // the max (descending) or min (ascending) sort value.
  plan = plan.groupBy(
    ['uri'],
    [
      op.sample('dataType', op.col('dataType')),
      order === 'descending'
        ? op.max(sortByColName, op.col(sortByColName))
        : op.min(sortByColName, op.col(sortByColName)),
    ],
  );

  return plan;
}
//#endregion

//#region Pagination
// Resolves the result page and slices the appropriate page of rows.
// When pageWith is specified, finds the page containing that document ID;
// otherwise uses the given page number.
function paginateResults({ rows, pageWith, page, pageLength }) {
  let resultPage;

  if (pageWith) {
    if (rows.length > MAXIMUM_PAGE_WITH_LENGTH) {
      throw new InvalidSearchRequestError(
        `The requested document could not be found in the first ${MAXIMUM_PAGE_WITH_LENGTH} results.`,
      );
    }
    const foundIndex = rows.findIndex((row) => row.id === pageWith);
    if (foundIndex === -1) {
      throw new InvalidSearchRequestError(
        `The requested document could not be found in the search results.`,
      );
    }
    resultPage = Math.ceil((foundIndex + 1) / pageLength);
  } else {
    resultPage = Math.max(page, 1);
  }

  const offset = (resultPage - 1) * pageLength;
  const searchResults = rows.slice(offset, offset + pageLength);
  return { resultPage, searchResults };
}
//#endregion

//#region Helper functions
function getPlanSource(plan) {
  return op
    .toSource(plan.export ? plan.export() : plan)
    .replace(/\n\s*/g, ' ')
    .replace(/"/g, "'");
}

// True iff `bucketName` is non-empty and every other content bucket is empty.
// Throws (via undefined.length) on a typo, which surfaces immediately.
function accContainsOnly(acc, bucketName) {
  if (acc[bucketName].length === 0) return false;
  return ACC_CONTENT_BUCKETS.every(
    (b) => b === bucketName || acc[b].length === 0,
  );
}
//#endregion

export {
  MAXIMUM_PAGE_WITH_LENGTH,
  analyzeLeafCriteria,
  buildPlans,
  buildSortedResultsPlan,
  getResultRowGrouping,
  paginateResults,
  performSearch,
  processCriteria,
  processCriteriaAsCts,
};
