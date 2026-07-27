'use strict';

//#region Imports
import op from '/MarkLogic/optic.mjs';
import { getSearchScopeTypes } from '../searchScope.mjs';
import * as utils from '../../utils/utils.mjs';
import { SEMANTIC_SORT_TIMEOUT } from '../appConstants.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
} from '../errorClasses.mjs';
import { SearchExecutionResult } from './SearchExecutionResult.mjs';
import { expandPredicate } from './prefixUtils.mjs';
import { NODE_TYPE_GROUP } from './criteriaNodes.mjs';
import { analyzeCriteria } from './analyzeCriteria.mjs';
import { calculateFacets } from './calculateFacets.mjs';
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
  const pageWith = scp.getPageWith();
  const includeSearchResults = scp.getIncludeSearchResults();
  const facetRequests = scp.getFacetRequests();
  let patternOptions = scp.getPatternOptions();

  try {
    let searchResults = [];
    let total = -1;
    let resultPage = -1;
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

      // Pass 2: build plans and determine execution strategy.
      // - selectedPlan: includes or excludes sort criteria based on need.
      // - ctsExecutionEligible: when true, avoids full row materialization;
      //   uses scopedCtsQuery for cts.estimate (total) and offset/limit (page).
      // - ctsSearchOptions: when non-null, cts.search replaces Optic execution
      //   entirely — walks indexes in the requested order and stops after the page.
      const {
        selectedPlan,
        ctsSearchOptions,
        ctsExecutionEligible,
        scopedCtsQuery,
      } = buildPlans({
        scp,
        analysis,
        groups: getResultRowGrouping(),
        sortCriteria: scp.getSortCriteria(),
        patternOptions,
        includeSearchResults,
        pageWith,
      });

      let rows = null;
      let scopedCtsQueryEstimate = null;
      if (ctsExecutionEligible) {
        const effectivePageLength = pageLength ?? 20;
        scopedCtsQueryEstimate = cts.estimate(scopedCtsQuery);
        total = scopedCtsQueryEstimate;
        resultPage = Math.max(page, 1);
        const offset = (resultPage - 1) * effectivePageLength;

        if (total === 0) {
          searchResults = [];
        } else if (ctsSearchOptions) {
          // Opt 26: cts.search for all CTS-eligible queries (except semantic
          // sort). Bypasses Optic entirely — cts.search walks indexes in the
          // requested order and stops after the page. Sort options were
          // pre-computed by buildCtsSearchOptions via buildPlans.
          const pageSlice = fn.subsequence(
            cts.search(scopedCtsQuery, ctsSearchOptions),
            utils.getStartingPaginationIndexForSubsequence(
              resultPage,
              effectivePageLength,
            ),
            effectivePageLength,
          );
          for (const doc of pageSlice) {
            searchResults.push({
              id: String(fn.baseUri(doc)),
              type: String(doc.xpath('/json/type')),
            });
          }
        } else {
          // Opt 18: fromLexicons plan already has {id, type} columns.
          searchResults = selectedPlan
            .offset(offset)
            .limit(effectivePageLength)
            .result()
            .toArray();
        }
      } else if (!includeSearchResults && scopedCtsQuery) {
        // Opt 21: facet-only request with CTS query — skip materialization.
      } else {
        rows = selectedPlan.result().toArray();

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
      }

      // Opt 21: calculateFacets dispatches internally based on rows/scopedCtsQuery.
      facetResponses = calculateFacets(
        rows,
        facetRequests,
        scopedCtsQuery,
        scopedCtsQueryEstimate,
      );
    }

    return new SearchExecutionResult({
      searchResults,
      total,
      resultPage,
      facetResponses,
    });
  } catch (ex) {
    console.warn({
      'Error during search execution': ex.message,
      requestId: scp.getRequestId(),
      stack: ex.stack,
    });
    throw ex;
  }
}

// Traverses criteria to fire pattern.apply() for side effects (e.g. value
// population via appendValues) without building or executing an Optic plan.
// Used by executeForValues in the related-list values-only path.
function traverseCriteria({
  scp,
  planCriteria,
  planScope = 'item',
  patternOptions,
  allowMultiScope = false,
}) {
  const analysis = analyzeCriteria({
    scp,
    planCriteria,
    planScope,
    allowMultiScope,
  });
  buildAccumulator({ scp, analysis, patternOptions });
}

// Builds a sub-plan for nested criteria (called by pattern classes).
// Always applies a select barrier projecting only iri + frag — the two
// columns hop patterns join on. parentId is required.
function processNestedCriteria({
  scp,
  planCriteria,
  planScope = 'item',
  patternOptions,
  parentId,
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
  const { acc, assemblyContext } = buildAccumulator({
    scp,
    analysis,
    patternOptions,
    parentScope,
  });
  const plan = assemblePlan(scp, { ...acc, ...assemblyContext });
  // CRITICAL OPTIMIZATION (Opt 17): Do not remove this select barrier.
  // Without it, MarkLogic's optimizer sees all columns across nested join
  // levels, flattens the join tree, and picks cross-product hash-joins that
  // explode to millions of intermediate rows (8+ seconds, 8GB memory).
  // With it, the optimizer is forced to plan each level independently,
  // reducing multi-hop queries from ~8400ms to ~11ms (764x improvement).
  const { iriCol, fragCol } = analysis.criteriaTree.columns;
  return plan.select([iriCol, fragCol]);
}

// Like processNestedCriteria but returns a bare CTS query when the inner criteria
// resolves to pure CTS constraints (no Optic joins needed). Returns null when
// the criteria requires an Optic plan — caller should fall back to the join path.
// The dataType constraint is intentionally omitted: callers use cts.values to
// resolve matching document IRIs, and the triple predicate already limits which
// scope's documents are valid objects.
function processNestedCriteriaAsCts({
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
  const { acc, assemblyContext } = buildAccumulator({
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
//
// When request context is provided (includeSearchResults, pageWith),
// buildPlans also selects the appropriate plan and determines
// the execution strategy. This keeps plan-shape decisions in Pass 2 rather
// than scattering them across the executor.
function buildPlans({
  scp,
  analysis: precomputedAnalysis = null,
  planCriteria,
  planScope = 'item',
  patternOptions,
  allowMultiScope = false,
  groups,
  sortCriteria = null,
  // Optional request context — when provided, enables strategy determination.
  includeSearchResults = null,
  pageWith = null,
}) {
  // performSearch always provides the analysis but there are other callers that do not.
  const analysis =
    precomputedAnalysis ??
    analyzeCriteria({
      scp,
      planCriteria,
      planScope,
      allowMultiScope,
    });

  const { acc, assemblyContext } = buildAccumulator({
    scp,
    analysis,
    patternOptions,
  });

  // Opt 20 extension: when annTopK is the sole criterion, skip fromLexicons
  // entirely. The TDE view already provides uri + dataType; joining back to
  // the base lexicon plan is pure overhead (43.9M IRI scan + groupBy).
  //
  // Note: Opt 20's fromSearch override is intentionally still below and not
  // in getDirectPlan as it is an execution-strategy swap (requires a coupled
  // offset/limit/joinDocAndUri executor in performSearch) though we may find
  // other direct-plan optimizations that below in getDirectPlan.
  const annTopKDirect = getDirectPlan(acc, assemblyContext);

  // Unsorted plan — used by facets.
  const unsortedResultsPlan = annTopKDirect
    ? annTopKDirect
    : collapseToResultRows(
        assemblePlan(scp, { ...acc, ...assemblyContext }),
        groups,
      );

  // Resolve sort strategy once — used by both Optic plan construction and
  // cts.search options (Opt 26).
  const sortStrategy = resolveSortStrategy({
    sortCriteria,
    hasScoreContributingCriteria: analysis.hasScoreContributingCriteria,
    hasCtsConstraints: acc.ctsConstraints.length > 0,
  });

  const sortedResultsPlan = buildSortedResultsPlan({
    unsortedResultsPlan,
    sortStrategy,
    acc,
    assemblyContext,
    scp,
    groups,
  });

  // Compose the accumulator's CTS constraints into a single scoped CTS query
  // when the accumulator is join-free. Null when the plan requires full
  // materialization. Gates Opt 18 (cts.estimate), Opt 21 (facets),
  // Opt 26 (cts.search <-- overtook Opt 20, fromSearch),
  const scopedCtsQuery = buildScopedCtsQuery(
    acc,
    assemblyContext,
    analysis.scope,
  );

  // Execution strategy: when request context is provided, select the plan
  // and determine whether the estimate-based strategy applies.
  let selectedPlan = null;
  let ctsExecutionEligible = false;
  let ctsSearchOptions = null;
  if (includeSearchResults != null) {
    selectedPlan = includeSearchResults
      ? sortedResultsPlan
      : unsortedResultsPlan;
    if (includeSearchResults && pageWith) {
      selectedPlan = selectedPlan.limit(MAXIMUM_PAGE_WITH_LENGTH + 1);
    }
    ctsExecutionEligible = isCtsExecutionEligible({
      includeSearchResults,
      pageWith,
      scopedCtsQuery,
    });

    // Opt 26: cts.search fast path — eligible when criteria are CTS-only
    // and the sort can be expressed as cts.search options. Semantic sort
    // requires Optic (triple hops) and falls back to Opt 18.
    if (ctsExecutionEligible) {
      ctsSearchOptions = buildCtsSearchOptions(sortStrategy);
    }
  }

  return {
    selectedPlan,
    sortedResultsPlan, // for developer use
    unsortedResultsPlan, // for developer use
    ctsExecutionEligible,
    ctsSearchOptions,
    scopedCtsQuery,
  };
}
//#endregion

//#region Core engine functions — Pass 2 (plan construction from criteria tree)

// Builds the raw plan accumulator by walking the criteria tree produced by
// analyzeCriteria (Pass 1). Thin wrapper that unpacks the analysis result
// and delegates to buildAccumulatorFromGroup.
function buildAccumulator({
  scp,
  analysis,
  patternOptions,
  parentScope = null,
}) {
  const { criteriaTree, scope, isMultiScope } = analysis;
  return buildAccumulatorFromGroup({
    scp,
    groupNode: criteriaTree,
    scope,
    isMultiScope,
    patternOptions,
    parentScope,
  });
}

// Core accumulator builder — operates directly on a group node.
// Used by buildAccumulator (top-level) and buildConjunction
// (sub-groups) without requiring synthetic wrapper objects.
function buildAccumulatorFromGroup({
  scp,
  groupNode,
  scope,
  isMultiScope = false,
  patternOptions,
  parentScope = null,
}) {
  const { uriCol, fragCol, iriCol, dataTypeCol } = groupNode.columns;
  const isTopLevel = groupNode.isTopLevel;
  const logicType = groupNode.conjunctionType;

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

  for (const child of groupNode.children) {
    if (child.type === NODE_TYPE_GROUP) {
      const result = buildConjunction({
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
      // Multi-scope groups skip the shared dataType constraint entirely
      // (see createPlanAccumulator) since branches may target different
      // scopes. Each leaf's own contribution must carry its own dataType
      // filter instead — child.scope is this leaf's own correct scope.
      mergeTermPlanContributions(
        acc,
        isMultiScope
          ? applyChildScopeFilter(contributions, child.scope)
          : contributions,
      );
    }
  }

  // Single-branch OR collapse was already handled in Pass 1 (the tree's
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
    hasScoreContributingCriteria: groupNode.hasScoreContributingCriteria,
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
  const constraints =
    isMultiScope || scopeAlreadyConstrained
      ? []
      : [op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false))];
  return {
    lexicons: {
      [uriCol]: cts.uriReference(),
      [iriCol]: cts.iriReference(),
      [dataTypeCol]: cts.fieldReference('anyDataTypeName'),
    },
    constraints,
    _initialConstraintCount: constraints.length,
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

// Wraps a multi-scope leaf's own contribution with a dataType filter scoped
// to that leaf's own branch (childScope), before it gets merged into the
// group's shared accumulator buckets and OR'd together with other branches.
// ctsConstraints are AND'd with the branch's dataType query; patternJoins are
// tagged with `scope` so assemblePlan's OR/AND join handling (see the
// patternJoins loop) can apply the correct per-branch op.in(dataType, ...)
// filter instead of relying on a shared/aggregate one.
function applyChildScopeFilter(contributions, childScope) {
  if (!contributions) return contributions;
  const dataTypeCtsQuery = buildDataTypeCtsQuery(childScope);
  if (!dataTypeCtsQuery) return contributions;
  return {
    ...contributions,
    ctsConstraints: (contributions.ctsConstraints ?? []).map((q) =>
      cts.andQuery([q, dataTypeCtsQuery]),
    ),
    patternJoins: (contributions.patternJoins ?? []).map((pj) => ({
      ...pj,
      scope: childScope,
    })),
  };
}

// Resolves a group node into either a join descriptor, a pure-CTS
// contribution to be folded into the parent's ctsConstraints, or a
// deferred andOrSubPlan.
// Returns: { join: ... } | { andOrSubPlan: ... } | { ctsConstraint: ctsQuery }
function buildConjunction({
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

  // Build the sub-accumulator from the sub-group directly and check
  // whether the result can be folded as pure CTS into the parent.
  const buildSubOrFold = (groupNode, negateFold = false) => {
    const { acc, assemblyContext } = buildAccumulatorFromGroup({
      scp,
      groupNode,
      // Use the sub-group's own scope (it may carry its own _scope under a
      // multi-scope OR), not the parent's — parentScope below still refers
      // to the parent's scope, for the scopeAlreadyConstrained comparison.
      scope: groupNode.scope,
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

  // The 3×3 logic matrix (minus same-type combinations which are guaranteed
  // to be inlined by Pass 1). Each remaining combination resolves the
  // sub-group into a join descriptor, pure-CTS fold, or deferred sub-plan.
  if (subConjunctionType === 'and') {
    switch (logicType) {
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
      case 'not': {
        const sub = buildSubOrFold(groupNode);
        return sub.plan ? notExistsJoinDesc(sub.plan) : sub;
      }
    }
  } else if (subConjunctionType === 'not') {
    switch (logicType) {
      case 'and': {
        // NOT-in-AND → notExistsJoin on { OR: child.NOT } rewrite.
        // The node already has the NOT's children; we reinterpret it
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
    `buildConjunction: unhandled combination logicType=${logicType}, subConjunctionType=${subConjunctionType}`,
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
          // No other constraints exist: extend the base plan directly
          // instead of outer joining to a duplicate lexicon scan — the
          // cheap path (avoids a second ~44M-row fromLexicons scan and
          // joinFullOuter). The shared base plan carries no dataType
          // constraint of its own for multi-scope groups (see
          // createPlanAccumulator), so a multi-scope-tagged join (pj.scope
          // set) applies its own filter here first via a plain .where() —
          // cheap, since it reuses the existing scan rather than starting a
          // new one. Later branches each still get their own independent
          // fromLexicons scan below (required to combine via joinFullOuter).
          if (pj.scope != null) {
            plan = plan.where(
              op.in(op.col(dataTypeCol), getSearchScopeTypes(pj.scope, false)),
            );
          }
          plan = plan.joinInner(pj.right, pj.on);
        } else {
          // Duplicate lexicon → inner join with right → align columns → full outer join.
          // Select uriCol (not fragCol) so the natural join key matches conjunction
          // joins and the final groupBy(['uri']) sees every matched document.
          // pj.scope (set for multi-scope branches — see applyChildScopeFilter)
          // takes precedence over the group's own shared scope.
          const wrapped = op
            .fromLexicons(lexicons, null, op.fragmentIdCol(fragCol))
            .joinInner(pj.right, pj.on)
            .where(
              op.in(
                op.col(dataTypeCol),
                getSearchScopeTypes(pj.scope ?? scope, false),
              ),
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
        // Defensive parity for a degenerate single-branch multi-scope OR
        // that collapsed to 'and' (Pass 1's OR→AND collapse is independent
        // of isMultiScope): the shared dataType constraint is skipped for
        // multi-scope groups, so a tagged join must filter for itself.
        if (pj.scope != null) {
          plan = plan.where(
            op.in(op.col(dataTypeCol), getSearchScopeTypes(pj.scope, false)),
          );
        }
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

// True when the accumulator has no Optic joins and no pattern-contributed
// Optic constraints — only the initial dataType constraint and CTS queries.
// Patterns like DateRange and IndexedRange add op.ge/op.le to constraints;
// cts.estimate can't evaluate those, so the fast path must not fire.
function isAccumulatorJoinFree(acc) {
  return (
    acc.ctsConstraints.length > 0 && accHasOnlyContentIn(acc, 'ctsConstraints')
  );
}

// Opt 20 extension: returns a self-sufficient direct plan when the accumulator
// contains exactly one pattern join that provides its own result columns,
// eliminating the need for fromLexicons, joinInner, and groupBy.
function getDirectPlan(acc, assemblyContext) {
  if (assemblyContext.logicType !== 'and') return null;
  if (!accHasOnlyContentIn(acc, 'patternJoins')) return null;
  if (acc.patternJoins.length !== 1) return null;

  const pj = acc.patternJoins[0];
  const q = pj.annTopKViewQualifier;
  if (!pj.annTopKSelfSufficient || !pj.annTopKPlanForDirect || !q) return null;

  // The direct plan carries view-qualified columns ({qualifier}.uri, etc.).
  // Use the qualifier to reference them unambiguously through groupBy + select.
  return pj.annTopKPlanForDirect
    .groupBy(
      [op.viewCol(q, 'uri')],
      [op.sample('dataType', op.viewCol(q, 'dataType'))],
    )
    .select([
      op.as('id', op.viewCol(q, 'uri')),
      op.as('type', op.col('dataType')),
    ]);
}

// Returns a CTS dataType filter for the given scope, or null when the scope
// has no associated dataTypes (e.g. 'multi', or an unrecognized scope name).
function buildDataTypeCtsQuery(scope) {
  const scopeTypes = getSearchScopeTypes(scope, false);
  return scopeTypes.length
    ? cts.fieldValueQuery('anyDataTypeName', scopeTypes)
    : null;
}

// Returns the accumulator's CTS constraints composed into a single query
// with a scope dataType filter, or null when full materialization is required.
// Used by cts.estimate (Opt 18), op.fromSearch (Opt 20), and facets (Opt 21).
// For multi-scope groups, `scope` is 'multi' and buildDataTypeCtsQuery returns
// null — each branch already carries its own dataType filter (see
// applyChildScopeFilter), so no additional wrap is needed here.
function buildScopedCtsQuery(acc, assemblyContext, scope) {
  if (!isAccumulatorJoinFree(acc)) return null;
  const composedCts = wrapCtsByLogicType(
    assemblyContext.logicType,
    acc.ctsConstraints,
  );
  const dataTypeCtsQuery = buildDataTypeCtsQuery(scope);
  return dataTypeCtsQuery
    ? cts.andQuery([composedCts, dataTypeCtsQuery])
    : composedCts;
}

// Returns true when the request shape and plan structure allow CTS-based
// execution: cts.estimate for count, offset/limit for pagination, and
// (with Opt 20) fromSearch instead of fromLexicons for page results.
// Requires the accumulator to be join-free (CTS-foldable).
// Facets are compatible: calculateFacets works directly with scopedCtsQuery.
function isCtsExecutionEligible({
  includeSearchResults,
  pageWith,
  scopedCtsQuery,
}) {
  return includeSearchResults && !pageWith && scopedCtsQuery != null;
}
//#endregion

//#region Sort
// Resolves sort precedence into a strategy descriptor. Determines WHAT to
// sort by without determining HOW (Optic plan vs cts.search). Consumed by
// both buildSortedResultsPlan (Optic path) and buildCtsSearchOptions
// (cts.search path).
//
// Precedence (first match wins):
//   1. Random
//   2. Non-semantic (field lexicon sort)
//   3. Semantic (triple hop sort)
//   4. Relevance (score-based)
//   5. Unsorted
function resolveSortStrategy({
  sortCriteria,
  hasScoreContributingCriteria,
  hasCtsConstraints,
}) {
  if (sortCriteria?.isRandomSort()) {
    return { type: 'random' };
  }
  if (sortCriteria?.hasNonSemanticSortDescriptors()) {
    return {
      type: 'nonSemantic',
      descriptors: sortCriteria.getNonSemanticSortDescriptors(),
      includeRelevance:
        sortCriteria.areScoresRequired() &&
        hasScoreContributingCriteria &&
        hasCtsConstraints,
      relevanceOrder: sortCriteria.getRelevanceOrder(),
    };
  }
  if (sortCriteria?.hasSemanticSortOption()) {
    return { type: 'semantic', option: sortCriteria.getSemanticSortOption() };
  }
  if (
    sortCriteria?.areScoresRequired() &&
    hasScoreContributingCriteria &&
    hasCtsConstraints
  ) {
    return { type: 'relevance', order: sortCriteria.getRelevanceOrder() };
  }
  return { type: 'unsorted' };
}

// Converts a sort strategy into a cts.search options array for Opt 26.
// Returns null when the strategy requires Optic (semantic sort).
function buildCtsSearchOptions(sortStrategy) {
  if (sortStrategy.type === 'semantic') return null;

  const options = ['unfiltered'];
  if (sortStrategy.type === 'random') {
    options.push('score-random');
  } else if (sortStrategy.type === 'nonSemantic') {
    for (const d of sortStrategy.descriptors) {
      options.push(
        cts.indexOrder(
          cts.fieldReference(d.indexReference),
          d.order === 'descending' ? 'descending' : 'ascending',
        ),
      );
    }
    if (sortStrategy.includeRelevance) {
      options.push(
        cts.scoreOrder(
          sortStrategy.relevanceOrder === 'ascending'
            ? 'ascending'
            : 'descending',
        ),
      );
    } else {
      options.push('score-zero');
    }
  } else if (sortStrategy.type === 'relevance') {
    options.push(
      cts.scoreOrder(
        sortStrategy.order === 'ascending' ? 'ascending' : 'descending',
      ),
    );
  } else {
    options.push('score-zero');
  }
  return options;
}

// Builds and returns the sorted Optic plan for the given sort strategy.
// Uses resolveSortStrategy output to select the plan construction path.
function buildSortedResultsPlan({
  unsortedResultsPlan,
  sortStrategy,
  acc,
  assemblyContext,
  scp,
  groups,
}) {
  switch (sortStrategy.type) {
    case 'random': {
      const randomColName = 'randomSortCol';
      const planWithRandom = unsortedResultsPlan.bind(
        op.as(randomColName, op.xdmp.random()),
      );
      return planWithRandom.orderBy(op.desc(op.col(randomColName)));
    }
    case 'nonSemantic': {
      const { sortAggregates, sortOrderBy, sortSelectCols } =
        buildNonSemanticSortSpec(sortStrategy.descriptors, {
          includeScoreAsSecondarySort: sortStrategy.includeRelevance,
          relevanceOrder: sortStrategy.relevanceOrder,
        });
      return collapseToResultRows(
        applyNonSemanticSort(
          assemblePlan(scp, { ...acc, ...assemblyContext }),
          sortStrategy.descriptors,
          assemblyContext.fragCol,
        ),
        groups,
        sortAggregates,
        sortOrderBy,
        sortSelectCols,
      );
    }
    case 'semantic': {
      xdmp.setRequestTimeLimit(SEMANTIC_SORT_TIMEOUT);
      const sortByColName = 'sortByMe';
      const sortByCol = op.col(sortByColName);
      return collapseToResultRows(
        applySemanticSort(
          assemblePlan(scp, { ...acc, ...assemblyContext }),
          sortStrategy.option,
          sortByColName,
        ),
        groups,
        [sortByCol],
        [
          sortStrategy.option.order === 'descending'
            ? op.desc(sortByCol)
            : op.asc(sortByCol),
        ],
      );
    }
    case 'relevance': {
      const scoreColName = 'score';
      // TODO, FUNC: Using op.max to aggregate scores across fragments. Should
      // we use op.sum (rewards matching across multiple fragments) or keep
      // op.max (uses the best-matching fragment's score)?
      const scoreAgg = op.max(scoreColName, op.col(scoreColName));
      return collapseToResultRows(
        assemblePlan(scp, { ...acc, ...assemblyContext }),
        groups,
        [scoreAgg],
        [
          sortStrategy.order === 'ascending'
            ? op.asc(op.col(scoreColName))
            : op.desc(op.col(scoreColName)),
        ],
        [scoreColName],
      );
    }
    default:
      return unsortedResultsPlan;
  }
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

// Applies a non-semantic (lexicon-based) sort to a plan. LEFT OUTER joins a
// separate fromLexicons per sort field on fragment ID, preserving results that
// lack sort values (they receive null and sort last). Each field is joined
// independently so a document missing one sort field keeps values from others.
//
// If a document has multiple values in a sort lexicon, joinLeftOuter can
// multiply rows. Callers collapse with direction-aware aggregates
// (ascending -> min, descending -> max) before ordering/pagination.
function applyNonSemanticSort(plan, sortDescriptors, fragCol) {
  for (let i = 0; i < sortDescriptors.length; i++) {
    const sortDescriptor = sortDescriptors[i];
    const sortColName = `sort_${sortDescriptor.indexReference}`;
    const sortFragCol = `sortFrag${i}`;
    const sortPlan = op.fromLexicons(
      {
        [sortColName]: cts.fieldReference(sortDescriptor.indexReference),
      },
      null,
      op.fragmentIdCol(sortFragCol),
    );
    plan = plan.joinLeftOuter(
      sortPlan,
      op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol(sortFragCol)),
    );
  }
  return plan;
}

// Builds common descriptor-derived components used by both non-semantic sort
// call paths: aggregates for dedupe, orderBy expressions, and select columns.
//
// Note: when results do not have the values being sorted on, the order is not
// consistent.  We can make them consistent by also sorting on fragment ID.  The
// groupBy preceding the orderBy would have to allow the fragment ID through.
function buildNonSemanticSortSpec(
  sortDescriptors,
  { includeScoreAsSecondarySort = false, relevanceOrder = 'descending' } = {},
) {
  const sortAggregates = [];
  const sortOrderBy = [];
  const sortSelectCols = [];
  for (const sortDescriptor of sortDescriptors) {
    const sortColName = `sort_${sortDescriptor.indexReference}`;
    sortAggregates.push(
      sortDescriptor.order === 'descending'
        ? op.max(sortColName, op.col(sortColName))
        : op.min(sortColName, op.col(sortColName)),
    );
    sortOrderBy.push(
      sortDescriptor.order === 'descending'
        ? op.desc(sortColName)
        : op.asc(sortColName),
    );
    sortSelectCols.push(sortColName);
  }

  // When relevance is explicitly requested alongside non-semantic sorts,
  // apply score as a secondary order key so logtfidf work is used.
  if (includeScoreAsSecondarySort) {
    sortAggregates.push(
      relevanceOrder === 'ascending'
        ? op.min('score', op.col('score'))
        : op.max('score', op.col('score')),
    );
    sortOrderBy.push(
      relevanceOrder === 'ascending'
        ? op.asc(op.col('score'))
        : op.desc(op.col('score')),
    );
    sortSelectCols.push('score');
  }

  return {
    sortAggregates,
    sortOrderBy,
    sortSelectCols,
  };
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
// True iff `bucketName` is non-empty and every other content bucket is empty.
// Throws (via undefined.length) on a typo, which surfaces immediately.
function accContainsOnly(acc, bucketName) {
  if (acc[bucketName].length === 0) return false;
  return ACC_CONTENT_BUCKETS.every(
    (b) => b === bucketName || acc[b].length === 0,
  );
}

// True iff the named buckets are the only non-empty content buckets AND no
// pattern-contributed Optic constraints exist beyond the initial set.
// Consolidates the shape check used by isAccumulatorJoinFree and getDirectPlan.
function accHasOnlyContentIn(acc, ...bucketNames) {
  if (acc.constraints.length !== acc._initialConstraintCount) return false;
  return ACC_CONTENT_BUCKETS.every((b) => {
    if (b === 'constraints') return true; // handled by _initialConstraintCount above
    if (bucketNames.includes(b)) return true;
    return acc[b].length === 0;
  });
}
//#endregion

export {
  MAXIMUM_PAGE_WITH_LENGTH,
  buildCtsSearchOptions,
  buildPlans,
  buildScopedCtsQuery,
  buildSortedResultsPlan,
  calculateFacets,
  getDirectPlan,
  getResultRowGrouping,
  isAccumulatorJoinFree,
  isCtsExecutionEligible,
  paginateResults,
  performSearch,
  processNestedCriteria,
  processNestedCriteriaAsCts,
  resolveSortStrategy,
  traverseCriteria,
};
