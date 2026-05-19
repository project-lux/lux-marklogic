'use strict';

//#region Imports
import op from '/MarkLogic/optic.mjs';
import { getSearchScopeTypes, isSearchScopeName } from '../searchScope.mjs';
import * as utils from '../../utils/utils.mjs';
import { FACETS_CONFIG } from '../../config/facetsConfig.mjs';
import { SEMANTIC_FACETS_CONFIG } from '../../config/semanticFacetsConfig.mjs';
import { isSemanticFacet } from '../facetsLib.mjs';
import {
  getSearchTermNames,
  getSearchTermConfig,
} from '../../config/searchTermsConfig.mjs';
import { convertSecondsToDateStr } from '../../utils/dateUtils.mjs';
import {
  DEFAULT_SEARCH_OPTIONS_EXACT,
  DEFAULT_SEARCH_OPTIONS_KEYWORD,
  SEARCH_OPTIONS_NAME_KEYWORD,
  SEMANTIC_SORT_TIMEOUT,
} from '../appConstants.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
  NotImplementedError,
} from '../errorClasses.mjs';
import { FacetResponses } from './FacetResponses.mjs';
import { SearchExecutionResult } from './SearchExecutionResult.mjs';
import { SearchTerm } from './SearchTerm.mjs';
import { SearchTermConfig } from './SearchTermConfig.mjs';
import {
  OPTION_NAME_PREFER_FRAG_JOINS,
  PatternOptions,
} from './PatternOptions.mjs';
// Side-effect imports: each pattern self-registers with SearchPatternBase.
import './patterns/AnnTopK.mjs';
import './patterns/DateRange.mjs';
import './patterns/DocumentIdOrIri.mjs';
import './patterns/Geospatial.mjs';
import './patterns/HopInverse.mjs';
import './patterns/HopWithField.mjs';
import './patterns/Keyword.mjs';
import './patterns/IndexedRange.mjs';
import './patterns/IndexedValue.mjs';
import './patterns/IndexedWord.mjs';
import { SearchPatternBase } from './patterns/SearchPatternBase.mjs';
import { expandPredicate } from './prefixUtils.mjs';
import { STOP_WORDS } from '../../data/stopWords.mjs';
//#endregion

//#region Constants
const MAXIMUM_PAGE_WITH_LENGTH = 100000;
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
  const sortCriteria = scp.getSortCriteria();
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
      const { sortedResultsPlan, unsortedResultsPlan } = buildPlans({
        scp,
        planCriteria: searchCriteria,
        planScope: searchScope,
        allowMultiScope,
        groups: getResultRowGrouping(),
        sortCriteria,
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
function processCriteria({
  scp,
  planCriteria,
  planScope = 'item',
  patternOptions,
  groups = null,
  parentId = null,
  allowMultiScope = false,
}) {
  const { acc, assemblyContext } = buildCriteriaAccumulator({
    scp,
    planCriteria,
    planScope,
    patternOptions,
    parentId,
    allowMultiScope,
  });
  return assemblePlan({ ...acc, ...assemblyContext });
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
function buildPlans({
  scp,
  planCriteria,
  planScope = 'item',
  patternOptions,
  allowMultiScope = false,
  groups,
  sortCriteria = null,
}) {
  const { acc, assemblyContext } = buildCriteriaAccumulator({
    scp,
    planCriteria,
    planScope,
    patternOptions,
    allowMultiScope,
  });

  // Unsorted plan — used by facets.
  const unsortedResultsPlan = collapseToResultRows(
    assemblePlan({ ...acc, ...assemblyContext }),
    groups,
  );

  // Sorted plan — used for search results.
  let sortedResultsPlan;
  const sortAggregates = [];
  const sortOrderBy = [];
  const sortLexicons = {};
  if (sortCriteria?.hasNonSemanticSortDescriptors()) {
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
    sortedResultsPlan = collapseToResultRows(
      assemblePlan({ ...sortAcc, ...assemblyContext }),
      groups,
      sortAggregates,
      sortOrderBy,
    );
  } else if (sortCriteria?.hasSemanticSortOption()) {
    xdmp.setRequestTimeLimit(SEMANTIC_SORT_TIMEOUT);

    const semanticSortOption = sortCriteria.getSemanticSortOption();
    const sortByColName = 'sortByMe';
    const sortByCol = op.col(sortByColName);
    sortedResultsPlan = collapseToResultRows(
      applySemanticSort(
        assemblePlan({ ...acc, ...assemblyContext }),
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
  } else {
    sortedResultsPlan = unsortedResultsPlan;
  }

  return { sortedResultsPlan, unsortedResultsPlan };
}
//#endregion

//#region Core engine functions
// Builds the raw plan accumulator from search criteria.  Shared by both
// top-level (buildPlans) and recursive (processCriteria) paths.
function buildCriteriaAccumulator({
  scp,
  planCriteria,
  planScope = 'item',
  patternOptions,
  parentId = null,
  allowMultiScope = false,
}) {
  const isTopLevel = !parentId;
  const uriCol = isTopLevel ? 'uri' : parentId + '_uri';
  const fragCol = isTopLevel ? 'frag' : parentId + '_frag';
  const iriCol = isTopLevel ? 'iri' : parentId + '_iri';
  const dataTypeCol = isTopLevel ? 'dataType' : parentId + '_dataType';

  if (!utils.isDefined(planCriteria)) {
    throw new InvalidSearchRequestError('search criteria must be defined.');
  }

  let scope = isTopLevel ? (planCriteria._scope ?? planScope) : planScope;

  const isMultiScope = scope === 'multi';
  if (isMultiScope) {
    validateMultiScopeCriteria(planCriteria, isTopLevel, allowMultiScope);
  }

  let searchTermNames = isMultiScope ? null : getSearchTermNames(scope);

  const { criteria, logicType } = parseCriteriaAndLogicType(planCriteria);

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
      const result = buildConjunctionJoin({
        criterion,
        logicType,
        scope,
        patternOptions,
        id,
        uriCol,
        fragCol,
        scp,
      });
      if (result.inlineCriteria) {
        criteria.push(...result.inlineCriteria);
      } else if (result.andOrSubPlan) {
        // Deferred: AND-encounters-OR sub-plans are combined off the outer
        // fragment in assemblePlan to avoid SPARQL fusion when 2+ are
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
    if (!name) {
      throw new InvalidSearchRequestError(
        `search term does not specify a term name in criteria ${JSON.stringify(criterion)}.`,
      );
    }
    const searchTerm = buildLeafSearchTerm({
      criterion,
      id,
      name,
      scope,
      isTopLevel,
      iriCol,
      uriCol,
      fragCol,
      dataTypeCol,
    });

    // Validate and sanitize wildcard characters for keyword-type terms.
    const rawCriteria = searchTerm.getCriteria();
    if (
      typeof rawCriteria === 'string' &&
      SearchPatternBase.get(
        searchTerm.getSearchTermConfig().getPatternName(),
      ).getAllowedSearchOptionsName() === SEARCH_OPTIONS_NAME_KEYWORD &&
      WILDCARD_CHAR_REGEX.test(rawCriteria)
    ) {
      searchTerm.setValue(sanitizeAndValidateWildcardedStrings(rawCriteria));
    }

    // Skip stop words and punctuation-only terms.
    // Check the raw criteria (pre-cast JS string), not getValue() which may
    // be an xs.string typed value that fails the typeof === 'string' guard.
    const unusableWords = getUnusableTermWords(searchTerm.getCriteria());
    if (unusableWords.length > 0) {
      searchTerm.setUsable(false);
      unusableWords.forEach((w) => scp.addIgnoredTerm(w));
      continue;
    }

    scp.incrementCriteriaCount();
    mergeTermPlanContributions(
      acc,
      criteria,
      SearchPatternBase.get(
        searchTerm.getSearchTermConfig().getPatternName(),
      ).apply(scp, searchTerm, logicType, patternOptions),
    );
  }

  // Guard against searches composed entirely of stop words / punctuation.
  if (isTopLevel && scp.getCriteriaCount() < 1) {
    const ignored = scp.getIgnoredTerms();
    if (ignored.length > 0) {
      throw new InvalidSearchRequestError(
        `the search criteria given only contains '${ignored.join("', '")}', which is an ignored term(s). Please consider creating phrases using double quotes and/or adding additional criteria.`,
      );
    }
    throw new InvalidSearchRequestError('more search criteria is required.');
  }

  const assemblyContext = { fragCol, uriCol, dataTypeCol, scope, logicType };
  return { acc, assemblyContext };
}

// Parses a planCriteria object into a mutable array of criteria and a logic type
// ('and', 'or', or 'not'). A bare object (no AND/OR/NOT key) is treated as a
// single-element AND array.
function parseCriteriaAndLogicType(planCriteria) {
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
    // AND-encounters-OR sub-plans deferred until assemblePlan, where
    // 2+ are combined off the outer fragment before being joined back in.
    andOrSubPlans: [],
    patternJoins: [],
  };
}

// Constructs a SearchTerm for a single leaf criterion (non-conjunction).
// Resolves the term's config, applies pattern requirements, casts the value
// to the configured scalar type, and selects search options.
function buildLeafSearchTerm({
  criterion,
  id,
  name,
  scope,
  isTopLevel,
  iriCol,
  uriCol,
  fragCol,
  dataTypeCol,
}) {
  let termConfig = new SearchTermConfig(getSearchTermConfig(scope, name));

  const searchTerm = new SearchTerm()
    .addId(id)
    .addName(name)
    .addScopeName(scope)
    .addSearchTermConfig(termConfig)
    .addTopLevel(isTopLevel)
    .addParentColumns({ iriCol, uriCol, fragCol, dataTypeCol })
    .addCriteria(criterion[name]);

  // Runtime search term properties are represented with leading underscores on criteria.
  Object.keys(criterion)
    .filter((k) => k.startsWith('_'))
    .forEach((k) => {
      searchTerm.addProperty(k.substring(1), criterion[k]);
    });

  applyPatternRequirements(searchTerm, termConfig);

  // Validate that the pattern accepts the value's structural type.
  const rawValue = searchTerm.getCriteria();
  if (utils.isObject(rawValue)) {
    // When the child term is { id: value } or { iri: value } and the config specifies ID index
    // references, rewrite the search term to a simple indexedValue query on that index.  Skip when
    // the search term is transitive as valid results would be dropped.
    const childId = getChildId(rawValue);
    if (
      childId &&
      termConfig.hasIdIndexReferences() &&
      !termConfig.isTransitive()
    ) {
      termConfig = new SearchTermConfig({
        indexReferences: termConfig.getIdIndexReferences(),
        patternName: 'indexedValue',
        scalarType: 'string',
        forceExactMatch: true,
      });
      searchTerm
        .addName(name + 'Id')
        .addSearchTermConfig(termConfig)
        .setCriteria(childId);
    } else if (rawValue.AND || rawValue.OR || rawValue.NOT) {
      if (!termConfig.acceptsGroupAsChild()) {
        throw new InvalidSearchRequestError(
          `the '${name}' term contains a group but is not allowed to.`,
        );
      }
    } else if (Object.keys(rawValue).some((k) => !k.startsWith('_'))) {
      if (!termConfig.acceptsTermAsChild()) {
        throw new InvalidSearchRequestError(
          `the '${name}' term contains another term but is not allowed to.`,
        );
      }
    }
  } else if (!termConfig.acceptsAtomicValue()) {
    throw new InvalidSearchRequestError(
      `the search term '${name}' in scope '${scope}' does not accept atomic values.`,
    );
  }

  // Cast value to the correct type if scalar and not dateTime.
  let value;
  const scalarType = termConfig.getScalarType();
  const rawTermValue = searchTerm.getCriteria();
  if (scalarType && scalarType !== 'dateTime') {
    const caster = xs[scalarType];
    if (typeof caster !== 'function') {
      throw new InternalServerError(
        `Search term '${searchTerm.getName()}' has invalid scalarType '${scalarType}': xs.${scalarType} is not a function.`,
      );
    }
    value = caster(rawTermValue);
  } else {
    value = typeof rawTermValue === 'string' ? rawTermValue : null;
  }
  searchTerm.setValue(value);

  // TODO: resolve search options: pattern --> term config --> term instance.
  const searchOptions = termConfig.isForceExactMatch()
    ? DEFAULT_SEARCH_OPTIONS_EXACT
    : DEFAULT_SEARCH_OPTIONS_KEYWORD;
  searchTerm.setSearchOptions(searchOptions);

  return searchTerm;
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
}

// Resolves a nested conjunction criterion (AND/OR/NOT-keyed) into either a join descriptor
// or inline criteria to be appended to the processing queue.
// Returns: { join: { type, right, on, condition } } or { inlineCriteria: Array }
function buildConjunctionJoin({
  criterion,
  logicType,
  scope,
  patternOptions,
  id,
  uriCol,
  fragCol,
  scp,
}) {
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
      scp,
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
        // AND encounters OR. Defer: assemblePlan combines all such
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
function assemblePlan({
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
}) {
  let plan = op.fromLexicons(lexicons, null, op.fragmentIdCol(fragCol));

  if (constraints.length) {
    for (const constraint of constraints) {
      plan = plan.where(constraint);
    }
  }

  if (ctsConstraints.length) {
    const ctsWrapper =
      logicType === 'and'
        ? cts.andQuery
        : logicType === 'or'
          ? cts.orQuery
          : (x) => cts.notQuery(cts.orQuery(x));
    plan = plan.where(ctsWrapper(ctsConstraints));
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

// Applies root-level output transformations: groupBy, column renames (uri→id, dataType→type),
// and optional orderBy.
//
// Distance column support was removed as it was not based on finalized requirements.
// To re-add: (1) track pj.extraCols from patternJoins into a distanceCols array during
// assemblePlan, (2) include each in groupBy aggregation via op.sample, and
// (3) consolidate into a single 'distance' output column in the select (use op.fn.min
// for multiple distance sources, filter with op.isDefined).
function collapseToResultRows(
  plan,
  groups,
  sortAggregates = [],
  sortOrderBy = [],
) {
  if (groups) {
    plan = plan.groupBy(groups.by, groups.agg.concat(sortAggregates));
  }

  if (sortOrderBy.length > 0) {
    plan = plan.orderBy(sortOrderBy);
  }

  if (groups) {
    plan = plan.select(
      [op.as('id', op.col('uri')), op.as('type', op.col('dataType'))].concat(
        sortAggregates, // TODO: remove sort columns
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

//#region Stop word / punctuation detection
const PUNCTUATION_ONLY_REGEX = /^[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]*$/;

function isUnusableWord(word) {
  const cleaned = word.replace(/^"|"$/g, '');
  return (
    PUNCTUATION_ONLY_REGEX.test(cleaned) ||
    STOP_WORDS.has(cleaned.toLowerCase())
  );
}

// Returns the unusable words from a term value.  An empty array means the
// value is usable; a non-empty array lists every stop-word / punctuation
// token that should be reported as ignored.
function getUnusableTermWords(value) {
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (trimmed.length === 0) return [value];
  if (PUNCTUATION_ONLY_REGEX.test(trimmed)) return [trimmed];
  const words = utils.splitHonoringPhrases(trimmed);
  const unusable = words.filter(isUnusableWord);
  return unusable.length === words.length ? unusable : [];
}
//#endregion

//#region Wildcard validation
const WILDCARD_CHARS = '*?';
const WILDCARD_CHAR_REGEX = new RegExp(`[${WILDCARD_CHARS}]`);
const QUALIFYING_CHARS = '\\s\\-';
const QUALIFYING_CHARS_REGEX = new RegExp(`[${QUALIFYING_CHARS}]`);
const MINIMUM_QUALIFYING_CHAR_COUNT = 3;
const QUALIFYING_WILDCARD_REGEX = new RegExp(
  `([${WILDCARD_CHARS}][^${WILDCARD_CHARS}${QUALIFYING_CHARS}]{${MINIMUM_QUALIFYING_CHAR_COUNT},})|([^${WILDCARD_CHARS}${QUALIFYING_CHARS}]{${MINIMUM_QUALIFYING_CHAR_COUNT},}[${WILDCARD_CHARS}])`,
);
const WILDCARDS_TO_CONSOLIDATE_REGEX = new RegExp('([?*]+[*])|([*][?*]+)');

function hasInvalidWildcardCriteria(str) {
  const pieces = str.split(QUALIFYING_CHARS_REGEX);
  for (let i = 0; i < pieces.length; i++) {
    if (
      WILDCARD_CHAR_REGEX.test(pieces[i]) &&
      !QUALIFYING_WILDCARD_REGEX.test(pieces[i])
    ) {
      return true;
    }
  }
  return false;
}

// Whenever an asterisk touches another wildcard character, convert to a single asterisk.
function consolidateApplicableWildcards(str) {
  let matches;
  while ((matches = str.match(WILDCARDS_TO_CONSOLIDATE_REGEX))) {
    str = str.replace(matches[0], '*');
  }
  return str;
}

// After consolidating applicable wildcards, validate there is no invalid wildcard criteria.
// strOrArr may be a string or array of strings; the given type will be returned.
// Each string may be a word or phrase.
// The value of strOrArr can be modified; caller to update their variable to this function's return,
// providing caller wants the cleaned up value(s).
function sanitizeAndValidateWildcardedStrings(strOrArr) {
  if (strOrArr) {
    const returnOneValue = !utils.isArray(strOrArr);
    if (returnOneValue) {
      strOrArr = [strOrArr];
    }
    for (let i = 0; i < strOrArr.length; i++) {
      const origValue = strOrArr[i] + '';
      strOrArr[i] = consolidateApplicableWildcards(origValue.trim());
      if (hasInvalidWildcardCriteria(strOrArr[i])) {
        let msg = `wildcarded strings must have at least three non-wildcard characters before or after the wildcard; '${origValue}' does not qualify`;
        if (origValue != strOrArr[i]) {
          msg += `, even after adjusting to '${strOrArr[i]}'`;
        }
        throw new InvalidSearchRequestError(msg);
      }
    }
    if (returnOneValue) {
      strOrArr = strOrArr[0];
    }
  }
  return strOrArr;
}
//#endregion

//#region Helper functions
// Extracts the IRI string from a child { id: value } or { iri: value } term.
// Returns null when the value is not a direct ID/IRI reference.
function getChildId(termValue) {
  const value = termValue?.id ?? termValue?.iri ?? null;
  return typeof value === 'string' ? value : null;
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

function applyPatternRequirements(searchTerm, termConfig) {
  const patternName = termConfig.getPatternName();
  const pattern = SearchPatternBase.get(patternName);

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
//#endregion

export {
  MAXIMUM_PAGE_WITH_LENGTH,
  buildPlans,
  getChildId,
  getResultRowGrouping,
  paginateResults,
  performSearch,
  processCriteria,
  sanitizeAndValidateWildcardedStrings,
};
