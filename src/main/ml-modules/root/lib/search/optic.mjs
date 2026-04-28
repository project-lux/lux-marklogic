// This script may be used to convert search criteria into an Optic query,
// formatted as a plan, JSON object or source string.
'use strict';

import op from '/MarkLogic/optic.mjs';
import { getSearchScopeTypes } from '/lib/searchScope.mjs';
import {
  getSearchTermNames,
  getSearchTermConfig,
} from '/config/searchTermsConfig.mjs';
import { processSearchCriteria } from '/lib/searchLib.mjs';
import { START_OF_GENERATED_QUERY } from '/lib/SearchCriteriaProcessor.mjs';
import {
  ANN_K_DEFAULT,
  ANN_K_MAX,
  ANN_MAX_DISTANCE_DEFAULT,
} from '/lib/appConstants.mjs';
const sem = require('/MarkLogic/semantics.xqy');

// TODO: remove global debug array from MJS context.
const debug = [];

// Optic comparison operators
const comparators = {
  '=': op.eq,
  '!=': op.ne,
  '<': op.lt,
  '>': op.gt,
  '<=': op.le,
  '>=': op.ge,
};

// TODO: Add support for overriding these
const defaultCtsOptions = [
  'case-insensitive',
  'diacritic-insensitive',
  'punctuation-insensitive',
  'whitespace-insensitive',
  'stemmed',
  'wildcarded',
];

const defaultPlanOptions = {
  preferFragJoins: false,
};

const prefixMappings = {
  crm: 'http://www.cidoc-crm.org/cidoc-crm/',
  la: 'https://linked.art/ns/terms/',
  lux: 'https://lux.collections.yale.edu/ns/',
  skos: 'http://www.w3.org/2004/02/skos/core#',
};

function getPrefixesForSPARQL() {
  return Object.entries(prefixMappings)
    .map(([prefix, uri]) => `PREFIX ${prefix}: <${uri}>`)
    .join('\n');
}

function expandPredicates(predicates) {
  return predicates.map((predicate) =>
    sem.curieExpand(predicate, prefixMappings),
  );
}

function formatPredicatesForSPARQL(predicates, transitive = true) {
  const individuals = transitive
    ? predicates.map((predicate) => {
        // TODO: optimization idea = omit + when single criterion as group by nullifies need.
        return predicate.concat('+');
      })
    : predicates;
  return `(${individuals.join(' | ')})`;
}

function getPlanSource(plan) {
  return op
    .toSource(plan.export ? plan.export() : plan)
    .replace(/\n\s*/g, ' ')
    .replace(/"/g, "'");
}

function getOpticPlan(
  planCriteria,
  planScope = 'item',
  groups = null,
  parentId = null,
  options = defaultPlanOptions,
) {
  debug.push('Called getOpticPlan');
  debug.push(
    xdmp.toJSON({
      planCriteria: planCriteria,
      planScope: planScope,
      parentId: parentId,
      options: options,
    }),
  );

  const topLevel = !parentId;
  const uriCol = topLevel ? 'uri' : parentId + '_uri'; // If this isn't the root criteria, it needs to be joined back
  const fragCol = topLevel ? 'frag' : parentId + '_frag'; // Joining on frag can result in different plans (more D-Node pushdown)
  const iriCol = topLevel ? 'iri' : parentId + '_iri'; // IRI is used for semantic hops

  // It's possible to implement an "all" option as a default, although this may not have been done for performance reasons possibly?  Defaulting to 'item' for now.
  const scope = planCriteria._scope ?? planScope;

  // Search terms are keys that don't start with '_' and exist in searchTermsConfig.mjs
  // Is there a reason the term isn't a value?
  // Get a list of names now so we can efficiently find them in the criteria.
  const searchTermNames = getSearchTermNames(scope);

  // Queries always return URIs and dataType so we start from these lexicons.  This may be optimized differently for different queries later.
  // I will note where additional indexes were added in comments so they can be moved into the DB config later.
  // I am using Range Path Indexes for this so they can be easily found and because Optic needs range indexes, but Fields can be used if desired as long as a range index is assigned.
  const lexicons = {
    [uriCol]: cts.uriReference(),
    [iriCol]: cts.iriReference(),
    dataType: cts.fieldReference('anyDataTypeName'),
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
  let constraints = [
    // If using scope-specific indexes, we don't need this constraint explicitly filtered.
    //op.in(op.col('dataType'), getSearchScopeTypes(scope))
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

  let criteria;
  let logicType;

  // Look for `AND:[]`, `OR:[]`, or `NOT:[]` in the root.
  // Note: This code may add addtitional elements to the array, hence the manual iteration and deep copy.
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

  debug.push(`Logic Type: ${logicType}`);

  // Loop through search criteria, adding operators
  for (let idx = 0; idx < criteria.length; idx++) {
    const criterion = criteria[idx];

    debug.push(`Processing Criterion ${idx}`);
    debug.push(xdmp.toJSON(criterion));

    // Used when creating a new column that needs to be joined or filtered.
    // Logical names might make sense for debugging, but just use UUIDs for now.
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

          const _joinCol = options.preferFragJoins
            ? op.as(fragCol, op.fragmentIdCol(id + '_frag'))
            : op.as(uriCol, op.col(id + '_uri'));

          conjunctionJoins.push({
            type: 'joinFullOuter',
            right: getOpticPlan(criterion, scope, null, id, options).select([
              _joinCol,
              'dataType',
            ]),
            on: null,
            condition: null,
          });
          break;

        case 'not':
          // We are in a NOT and encounter an AND - not exists join
          conjunctionJoins.push({
            type: 'notExistsJoin',
            right: getOpticPlan(criterion, scope, null, id, options).select(
              options.preferFragJoins ? [id + '_frag'] : [id + '_uri'],
            ),
            on: options.preferFragJoins
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
            right: getOpticPlan(criterion, scope, null, id, options).select(
              options.preferFragJoins ? [id + '_frag'] : [id + '_uri'],
            ),
            on: options.preferFragJoins
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
            right: getOpticPlan(criterion, scope, null, id, options).select(
              options.preferFragJoins ? [id + '_frag'] : [id + '_uri'],
            ),
            on: options.preferFragJoins
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
            right: getOpticPlan(
              { OR: criterion.NOT },
              scope,
              null,
              id,
              options,
            ).select(options.preferFragJoins ? [id + '_frag'] : [id + '_uri']),
            on: options.preferFragJoins
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

          const _joinCol = options.preferFragJoins
            ? op.as(fragCol, op.fragmentIdCol(id + '_frag'))
            : op.as(uriCol, op.col(id + '_uri'));

          conjunctionJoins.push({
            type: 'joinFullOuter',
            right: getOpticPlan(criterion, scope, null, id, options).select([
              _joinCol,
              'dataType',
            ]),
            on: null,
            condition: null,
          });
          break;

        case 'not':
          // We are in a NOT and encounter a NOT - inner join and change to OR
          // This is equivalent and likely more performant (needs testing)
          conjunctionJoins.push({
            type: 'joinInner',
            right: getOpticPlan(
              { OR: criterion.NOT },
              scope,
              null,
              id,
              options,
            ).select(options.preferFragJoins ? [id + '_frag'] : [id + '_uri']),
            on: options.preferFragJoins
              ? op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol(id + '_frag'))
              : op.on(op.col(uriCol), op.col(id + '_uri')),
            condition: null,
          });
          break;
      }
      continue;
    }

    // I don't think multiple search terms can exist in the same object, but I guess it might be possible.  Need to double check.
    const termName = Object.keys(criterion).find(
      (k) => k[0] !== '_' && searchTermNames.includes(k),
    );
    const termConfig = getSearchTermConfig(scope, termName);

    debug.push('Found Term Config');
    debug.push(xdmp.toJSON(termConfig));

    // Cast value to the correct type if scalar
    const caster = termConfig.scalarType ? xs[termConfig.scalarType] : null;
    const termValue = caster
      ? caster(criterion[termName])
      : typeof criterion[termName] === 'string'
        ? criterion[termName]
        : null;

    debug.push(termValue);
    debug.push(typeof criterion[termName]);

    // TODO: Get additional options

    // TODO: Add support for views and other index types
    switch (termConfig.patternName) {
      case 'text': {
        debug.push('processing text');

        const newCriteria = {
          OR: [
            {
              textNoHop: criterion[termName],
            },
            {
              referencedBy: criterion[termName],
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
        ctsConstraints.push(
          cts.fieldValueQuery(
            termConfig.indexReferences,
            termValue,
            defaultCtsOptions,
          ),
        );
        break;
      }
      case 'indexedWord': {
        debug.push(`processing ${termConfig.patternName}`);

        // CTS constraint for same reason as indexedValue pattern.
        if (criterion._complete) {
          ctsConstraints.push(
            cts.fieldValueQuery(
              termConfig.indexReferences,
              termValue,
              defaultCtsOptions,
            ),
          );
        } else {
          ctsConstraints.push(
            cts.fieldWordQuery(
              termConfig.indexReferences,
              termValue,
              defaultCtsOptions,
            ),
          );
        }
        break;
      }
      case 'indexedRange': {
        // TODO: I think this would be better with fromView, as it would give more flexibility in selecting measures
        debug.push('processing indexedRange');

        if (logicType === 'and') {
          const constraint = comparators[criterion._comp];
          // This requires that each term config only has one index reference. This is true today, but is it guaranteed?
          lexicons[id + '_field'] = cts.fieldReference(
            termConfig.indexReferences[0],
          );
          constraints.push(constraint(op.col(id + '_field'), termValue));
        } else {
          // OR and NOT
          ctsConstraints.push(
            cts.fieldRangeQuery(
              termConfig.indexReferences,
              criterion._comp,
              termValue,
            ),
          );
        }
        break;
      }
      case 'propertyValue': {
        // CTS version has special handling for recordType, but this is the only kind in the config
        // For now, I'm only implementing this for recordType
        debug.push('processing propertyValue');

        // TODO: the property value pattern is not restricted to dataType.
        if (logicType === 'and') {
          constraints.push(op.eq(op.col('dataType'), termValue));
        } else {
          // OR and NOT
          ctsConstraints.push(
            cts.fieldValueQuery(scope + 'DataTypeName', termValue),
          );
        }
        break;
      }
      case 'hopWithField': {
        debug.push('processing hopWithField');
        let termPlanArrays;
        if (termConfig.transitive) {
          termPlanArrays = processTransitiveHopWithFieldTerm({
            fragCol,
            iriCol,
            id,
            termConfig,
            termValue,
            termName,
            criterion,
            options,
          });
        } else {
          termPlanArrays = processHopWithFieldTerm({
            fragCol,
            iriCol,
            id,
            termConfig,
            termValue,
            termName,
            criterion,
            options,
          });
        }
        addToPlanArrays(termPlanArrays);
        break;
      }
      case 'hopInverse': {
        debug.push('processing hopInverse');

        const _triFragCol = id + '_triFrag';
        const _refFrag = id + '_frag';
        const predicates = expandPredicates(termConfig.predicates);
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
          getOpticPlan(
            criterion[termName],
            termConfig.targetScope,
            rightGroups,
            id,
            options,
          ),
          [
            // Hop Inverse: the triple is on the referenced document, not the source document.
            op.on(op.fragmentIdCol(_triFragCol), op.fragmentIdCol(_refFrag)),
          ],
        );

        // debug.push('Generated right plan:');
        // debug.push(getPlanSource(right));

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
        debug.push('processing annTopK');

        const vecFrag = id + '_vecFrag';
        const distCol = id + '_distance';
        const vectorColumn = termConfig.vectorColumn ?? 'main';
        const maxDistance = termConfig.maxDistance ?? ANN_MAX_DISTANCE_DEFAULT;

        // k resolution: per-request option > term config default > build property default, capped by build property max.
        const requestedK =
          criterion._annK ?? termConfig.annKMaxDefault ?? ANN_K_DEFAULT;
        const k = Math.min(requestedK, ANN_K_MAX);
        debug.push(
          `annTopK k resolved to ${k} (requested ${requestedK}, max ${ANN_K_MAX})`,
        );

        // Require the seed document have the specified vector.
        if (!fn.docAvailable(termValue)) {
          throw new Error(
            `Document specified by search term ${termName} is not available: ${termValue}`,
          );
        }
        const vectorData = cts
          .doc(termValue)
          .xpath(`vectors/${vectorColumn}`)
          .toArray();
        if (!vectorData || vectorData.length === 0) {
          throw new Error(
            `Document specified by search term ${termName} is missing vector data for column '${vectorColumn}': ${termValue}`,
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
        debug.push('Generated annTopK plan:');
        debug.push(
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
        throw new Error(
          `Unimplemented pattern name: ${termConfig.patternName}.`,
        );
    }
  }

  // Optic uses functional programming patterns, so we will assign plan temporarily and replace it with each modification unless/until we need a more complex pattern.
  let plan = op.fromLexicons(lexicons, null, op.fragmentIdCol(fragCol));
  // debug.push('Initial lexicon plan:');
  // debug.push(getPlanSource(plan));

  if (constraints.length) {
    debug.push('Applying Constraints');
    for (const constraint of constraints) {
      debug.push({
        constraint,
      });
      plan = plan.where(constraint);
    }
    // debug.push(getPlanSource(plan));
  }

  if (ctsConstraints.length) {
    debug.push('Applying CTS Constraints');
    const ctsWrapper =
      logicType === 'and'
        ? cts.andQuery
        : logicType === 'or'
          ? cts.orQuery // NOT
          : (x) => cts.notQuery(cts.orQuery(x));

    plan = plan.where(ctsWrapper(ctsConstraints));
    // debug.push(getPlanSource(plan));
  }

  if (conjunctionJoins.length) {
    debug.push('Applying Conjunction Joins');
    for (const join of conjunctionJoins) {
      // debug.push({
      //   type: join.type,
      //   left: getPlanSource(plan),
      //   right: getPlanSource(join.right),
      //   on: join.on?.toString(),
      //   condition: join.condition,
      // });
      // Join functions are a method on the plan, so we have to reference them by name instead of storing the join itself in the array
      plan = plan[join.type](join.right, join.on, join.condition);
    }
    // debug.push(getPlanSource(plan));
  }

  if (patternJoins.length) {
    debug.push('Applying Pattern Joins');

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
          debug.push(
            'OR first join (inner): no non-join constraints, constraining base plan',
          );
          plan = plan.joinInner(pj.right, pj.on);
        } else {
          // Duplicate lexicon → inner join with right → align columns → full outer join.
          // Select uriCol (not fragCol) so the natural join key matches conjunction
          // joins and the final groupBy(['uri']) sees every matched document.
          debug.push('OR join (full outer via lexicon copy)');
          const wrapped = op
            .fromLexicons(lexicons, null, op.fragmentIdCol(fragCol))
            .joinInner(pj.right, pj.on)
            .select([uriCol, fragCol, 'dataType', ...pj.extraCols]);

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

    // debug.push(getPlanSource(plan));
  }

  if (groups) {
    debug.push(`Grouping by ${groups.by ? groups.by.join(', ') : 'none'}...`);
    const agg = distanceCols.length
      ? [
          ...groups.agg,
          ...distanceCols.map((col) => op.sample(col, op.col(col))),
        ]
      : groups.agg;
    plan = plan.groupBy(groups.by, agg);
    // debug.push(getPlanSource(plan));
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
      debug.push('Consolidating distance columns');

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

    debug.push('***********************************FINAL PLAN:');
    debug.push(getPlanSource(plan));
  }

  return plan;
}

/*
  Return: 
  {
    constraints,
    ctsConstraints,
    patternJoins,
    distanceCols
  }
*/
// Approach: embeds field plan's results into SPARQL.  Proven over 3x faster in 12.0.1 than
// hopPlan.joinInner(fieldPlan) when the embedded approach included the transitive operator (+)
// and the join approach did not.
//
// TODO: is there a limit on the number of IRIs we can embed and if so, can the likes of op.param
// or op.fromLiterals get around that?  Perhaps test with words that match 100K+ docs.
function processTransitiveHopWithFieldTerm({
  fragCol,
  iriCol,
  id,
  termConfig,
  termValue,
  termName,
  criterion,
  options,
}) {
  // Get the IRIs from the inner query and apply as a constraint to the SPARQL query.
  const _refIri = id + '_iri';
  // const rightGroups = {
  //   by: [_refIri],
  // };
  const constraintPlan = termValue
    ? getFieldAtomicPlan({
        fragCol,
        iriCol,
        id,
        termConfig,
        termValue,
        termName,
        criterion,
        options,
      })
    : getFieldNestedPlan({
        fragCol,
        iriCol,
        id,
        termConfig,
        termValue,
        termName,
        criterion,
        rightGroups: null, // Grouping by here prevents grouping by at the end.
        options,
      });
  // debug.push(`Transitive constraintPlan: ${getPlanSource(constraintPlan)}`);
  // TODO: if there are zero results from the constraintPlan, should we do anything different?
  const sparql = `
${getPrefixesForSPARQL()}
select ?${id}_s ?${id}_o where {
  VALUES ?${id}_o {
    ${constraintPlan
      .result()
      .toArray()
      .map((row) => `<${row[_refIri]}>`)
      .join('\n    ')}
  }
  ?${id}_s ${formatPredicatesForSPARQL(termConfig.predicates)} ?${id}_o
}`;
  // debug.push(`Transitive SPARQL: ${sparql}`);
  return {
    patternJoins: [
      {
        right: op.fromSPARQL(sparql, null, { dedup: 'on' }),
        on: [op.on(op.col(iriCol), op.col(id + '_s'))],
        extraCols: [],
      },
    ],
  };
}

function processHopWithFieldTerm({
  fragCol,
  iriCol,
  id,
  termConfig,
  termValue,
  termName,
  criterion,
  options,
}) {
  const _hopFragCol = id + '_hopFrag';
  const hopPlan = op.fromTriples([
    op.pattern(
      op.col(id + '_s'),
      expandPredicates(termConfig.predicates),
      op.col(id + '_o'),
      op.fragmentIdCol(_hopFragCol),
    ),
  ]);

  const _refIri = id + '_iri';
  // const rightGroups = {
  //   by: [_refIri],
  // };
  const fieldPlan = termValue
    ? getFieldAtomicPlan({
        fragCol,
        iriCol,
        id,
        termConfig,
        termValue,
        termName,
        criterion,
        options,
      })
    : getFieldNestedPlan({
        fragCol,
        iriCol,
        id,
        termConfig,
        termValue,
        termName,
        criterion,
        rightGroups: null, // Grouping by here prevents grouping by at the end.
        options,
      });

  // debug.push('Generated right plan:');
  // debug.push(getPlanSource(right));

  return {
    patternJoins: [
      {
        right: hopPlan.joinInner(
          fieldPlan,
          op.on(op.col(id + '_o'), op.col(_refIri)),
        ),
        // op.fromTriples doesn't return URIs so we are using fragment regardless of config
        on: [
          op.on(op.col(iriCol), op.col(id + '_s')),
          op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol(_hopFragCol)),
        ],
        extraCols: [],
      },
    ],
  };
}

function getFieldNestedPlan({
  fragCol,
  iriCol,
  id,
  termConfig,
  termValue,
  termName,
  criterion,
  rightGroups,
  options,
}) {
  return getOpticPlan(
    criterion[termName],
    termConfig.targetScope,
    rightGroups,
    id,
    options,
  );
}

function getFieldAtomicPlan({
  fragCol,
  iriCol,
  id,
  termConfig,
  termValue,
  termName,
  criterion,
  options,
}) {
  const _refIri = id + '_iri';
  return criterion._complete
    ? op
        .fromLexicons({
          [_refIri]: cts.iriReference(),
          // TODO: determine if support for a single index is an issue.
          [id + '_field']: cts.fieldReference(termConfig.indexReferences[0]),
        })
        .where(op.eq(op.col(id + '_field'), termValue))
    : op
        .fromLexicons({
          [_refIri]: cts.iriReference(),
        })
        .where(
          cts.fieldWordQuery(
            termConfig.indexReferences,
            termValue,
            defaultCtsOptions,
          ),
        );
}

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
function execute(searchCriteria, searchScope, includeResults = true) {
  try {
    // We need to group by uri because lexicons can hit multiple times in a doc
    const finalGroups = {
      by: ['uri'],
      agg: [op.sample('dataType', op.col('dataType'))],
    };

    const opticPlan = getOpticPlan(searchCriteria, searchScope, finalGroups);

    const planAsJson = opticPlan.export();

    return {
      results: includeResults ? opticPlan.result().toArray() : null,
      planAsJson,
      planAsSource: 'TODO: temporarily disabled', //getPlanSource(planAsJson),
      debug,
    };
  } catch (ex) {
    console.dir(debug);
    throw ex;
  }
}

export { execute };
