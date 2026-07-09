import op from '/MarkLogic/optic.mjs';
import {
  expandPredicates,
  formatPredicatesForSPARQL,
  getPrefixesForSPARQL,
} from '../prefixUtils.mjs';
import {
  CHILD_TYPE_GROUP,
  CHILD_TYPE_TERM,
  SearchPatternBase,
} from './SearchPatternBase.mjs';
import { SearchCriteriaProcessor as SCP } from '../../SearchCriteriaProcessor.mjs';
import { InternalServerError } from '../../errorClasses.mjs';
import { SearchTermConfig } from '../SearchTermConfig.mjs';
import { getSearchTermConfig } from '../../../config/searchTermsConfig.mjs';
import { getSearchScopeTypes } from '../../searchScope.mjs';

class HopInverse extends SearchPatternBase {
  apply(scp, searchTerm, logicType, patternOptions) {
    if (searchTerm.isTransitive()) {
      return this.#processTransitiveHopInverseTerm(
        scp,
        searchTerm,
        patternOptions,
      );
    } else {
      return this.#processHopInverseTerm(scp, searchTerm, patternOptions);
    }
  }

  #processHopInverseTerm(scp, searchTerm, patternOptions) {
    const id = searchTerm.getId();
    const termConfig = searchTerm.getSearchTermConfig();
    const parentIriCol = searchTerm.getParentIriColumn();
    const triFragCol = id + '_triFrag';
    const refFragCol = id + '_frag';
    const predicates = expandPredicates(termConfig.getPredicates());

    // This is the values-only implementation for related lists.
    const requestIsForValues = patternOptions.getReturnValues(false);
    if (requestIsForValues && searchTerm.isTopLevel()) {
      return this.#processValuesOnly(scp, searchTerm, patternOptions);
    }

    const tri = op.fromTriples([
      op.pattern(
        op.col(id + '_s'),
        predicates,
        op.col(id + '_o'),
        op.fragmentIdCol(triFragCol),
      ),
    ]);

    // Opt 24: when inner criteria resolves to pure CTS, apply it as .where()
    // directly on fromTriples instead of building a fromLexicons plan and
    // joining on fragment. Eliminates the intermediate IRI lexicon scan
    // (~43.9M rows) that dominates multi-hop query cost.
    const innerCts = scp.processNestedCriteriaAsCts({
      planCriteria: searchTerm.getCriteria(),
      planScope: termConfig.getTargetScopeName(),
      patternOptions: SCP.initializePatternOptions(),
      parentId: id,
    });
    if (innerCts) {
      return {
        patternJoins: [
          {
            right: tri.where(innerCts),
            on: op.on(op.col(parentIriCol), op.col(id + '_o')),
            extraCols: [],
          },
        ],
      };
    }

    // Fallback: Optic join path (when inner criteria requires joins).
    const right = tri.joinInner(
      scp.processNestedCriteria({
        planCriteria: searchTerm.getCriteria(),
        planScope: termConfig.getTargetScopeName(),
        patternOptions,
        parentId: id,
      }),
      [
        // Hop Inverse: the triple is on the referenced document, not the source document.
        op.on(op.fragmentIdCol(triFragCol), op.fragmentIdCol(refFragCol)),
      ],
    );

    return {
      patternJoins: [
        {
          right,
          // Can't join on frag because the triple isn't on the source document.
          on: op.on(op.col(parentIriCol), op.col(id + '_o')),
          extraCols: [],
        },
      ],
    };
  }
  // Copied from HopWithField's implementation.
  // Approach: embeds field plan's results into SPARQL.  Proven over 3x faster in 12.0.1 than
  // hopPlan.joinInner(fieldPlan) when the embedded approach included the transitive operator (+)
  // and the join approach did not.
  //
  // TODO: is there a limit on the number of IRIs we can embed and if so, can the likes of op.param
  // or op.fromLiterals get around that?  Perhaps test with words that match 100K+ docs.
  #processTransitiveHopInverseTerm(scp, searchTerm, patternOptions) {
    const hopIriCol = searchTerm.getParentIriColumn();
    const fieldIriCol = searchTerm.getIriColumn();
    const termConfig = searchTerm.getSearchTermConfig();
    const id = searchTerm.getId();

    // Get the subject IRIs from the inner query and apply as an object IRI constraint in the SPARQL query.
    const fieldPlan = searchTerm.hasValue() // inverse of searchTerm.hasCriteria()
      ? this.#getFieldAtomicPlan(scp, searchTerm, patternOptions)
      : this.#getFieldNestedPlan(scp, searchTerm, patternOptions);

    const sparql = `
${getPrefixesForSPARQL()}
select ?${id}_s ?${id}_o where {
  VALUES ?${id}_s {
    ${fieldPlan
      .result()
      .toArray()
      .map((row) => `<${row[fieldIriCol]}>`)
      .join('\n    ')}
  }
  ?${id}_s ${formatPredicatesForSPARQL(termConfig.getPredicates())} ?${id}_o
}`;

    return {
      patternJoins: [
        {
          right: op.fromSPARQL(sparql, null, { dedup: 'on' }),
          on: [op.on(op.col(hopIriCol), op.col(id + '_o'))],
          extraCols: [],
        },
      ],
    };
  }

  // Uses cts.triples directly for both hops, eliminating all Optic plan
  // construction and SPARQL compilation overhead.
  #processValuesOnly(scp, searchTerm, patternOptions) {
    const termConfig = searchTerm.getSearchTermConfig();
    const criteria = searchTerm.getCriteria();

    const childTermName = SCP.getFirstNonOptionPropertyName(criteria);
    const childId = childTermName
      ? SCP.getChildId(criteria[childTermName])
      : null;
    if (!childId) {
      throw new InternalServerError(
        `HopInverse values-only mode requires criteria with a direct child ID (e.g., { iri: "..." }). Got: ${JSON.stringify(criteria)}`,
      );
    }

    const childTermConfig = new SearchTermConfig(
      getSearchTermConfig(termConfig.getTargetScopeName(), childTermName),
    );
    const eagerEvaluation = patternOptions.getEagerEvaluation(true);
    const tripleOptions = [eagerEvaluation ? 'eager' : 'lazy', 'concurrent'];

    const childPredicates = expandPredicates(childTermConfig.getPredicates());
    const outerPredicates = expandPredicates(termConfig.getPredicates());
    const targetIRI = sem.iri(childId);

    // Fold both hops into one cts.triples() call by traversing one hop using
    // cts.tripleRangeQuery + a dataType constraint, passed into cts.triples.
    // Two separate cts.triples() calls each scoped by dataType alone are orders
    // of magnitude slower.
    const targetScopeTypes = getSearchScopeTypes(
      termConfig.getTargetScopeName(),
      false,
    );
    // Using default options and weight for values-only request.
    const childQuery = cts.tripleRangeQuery(
      [],
      childPredicates,
      targetIRI,
      '=',
    );
    const fragmentConstraint =
      targetScopeTypes.length > 0
        ? cts.andQuery([
            cts.fieldValueQuery('anyDataTypeName', targetScopeTypes, ['exact']),
            childQuery,
          ])
        : childQuery;

    const outerTriples = cts
      .triples([], outerPredicates, [], '=', tripleOptions, fragmentConstraint)
      .toArray();

    const excludeSelfIri = patternOptions.getExcludeSelfIri(null);
    const enforceDataCap = false; // TODO, FUNC: this was introduced for CTS functional parity testing.
    const maxValues = enforceDataCap
      ? patternOptions.getMaximumValues(null)
      : null;
    const values = [];
    for (const t of outerTriples) {
      if (maxValues && values.length >= maxValues) {
        break;
      }
      const obj = fn.string(sem.tripleObject(t));
      if (obj !== excludeSelfIri) {
        values.push(obj);
      }
    }

    scp.appendValues(values);
    return null;
  }

  // Known limitation: when the child pattern is 'hopInverse', the plan returned
  // here is rooted in op.fromLexicons (via processNestedCriteria), which only contains
  // document-backed IRIs. HopInverse's outer triple _o column can legitimately
  // yield non-document object IRIs, and those are silently dropped by the
  // lexicon-rooted join before HopWithField ever sees them. Both the transitive
  // and non-transitive paths are affected.
  //
  // Example:
  //    HopInverse:   Iri1WithDoc -> Predicate1 -> Iri2WithoutDoc
  //    HopWithField: Iri3WithDoc -> Predicate2 -> Iri2WithoutDoc
  // In this example, Iri2WithoutDoc is an object IRI found by the HopInverse pattern
  // that doesn't reach HopWithField, precluding HopWithField's ability to return
  // Iri1WithDoc as a search result.
  //
  // Potential resolution:
  //      Relax HopInverse's isTopLevel guard so #processValuesOnly fires when
  //      returnValues is true regardless of depth; HopWithField would set
  //      returnValues(true), call processNestedCriteria (triggering values-only),
  //      then read IRI strings from scp.getValues() (clearing before/after to
  //      prevent contamination). Reuses HopInverse's fast cts.triples path
  //      with no plan construction or duplication; particularly natural for the
  //      transitive path which already materializes IRIs. Requires a new
  //      clearValues() on SCP (since #values is private) and is limited to
  //      direct-IRI child criteria (#processValuesOnly throws otherwise).
  #getFieldNestedPlan(scp, searchTerm, patternOptions) {
    const termConfig = searchTerm.getSearchTermConfig();
    return scp.processNestedCriteria({
      planCriteria: searchTerm.getCriteria(),
      planScope: termConfig.getTargetScopeName(),
      patternOptions: SCP.initializePatternOptions(),
      parentId: searchTerm.getId(),
    });
  }

  #getFieldAtomicPlan(scp, searchTerm, patternOptions) {
    const id = searchTerm.getId();
    const termValue = searchTerm.getValue();
    const termSearchOptions = searchTerm.getSearchOptions();
    const termWeight = searchTerm.getWeight();
    const termConfig = searchTerm.getSearchTermConfig();
    const fieldIriCol = searchTerm.getIriColumn();
    const indexReferences = termConfig.getIndexReferences();
    const fieldCol = id + '_field';
    // When there is more than one index reference, use cts.fieldWordQuery
    return searchTerm.isCompleteMatch() && indexReferences.length === 1
      ? op
          .fromLexicons({
            [fieldIriCol]: cts.iriReference(),
            [fieldCol]: cts.fieldReference(indexReferences[0]),
          })
          .where(op.eq(op.col(fieldCol), termValue))
      : op
          .fromLexicons({
            [fieldIriCol]: cts.iriReference(),
          })
          .where(
            cts.fieldWordQuery(
              indexReferences,
              termValue,
              termSearchOptions,
              termWeight,
            ),
          );
  }

  mayTokenizeValue() {
    return false;
  }

  getRequiredRuntimeSearchTermProperties() {
    return [];
  }

  getAllowedChildren() {
    return CHILD_TYPE_GROUP + CHILD_TYPE_TERM;
  }

  isConvertIdChildToIri() {
    return false;
  }

  getAllowedSearchOptionsName() {
    return null;
  }

  getDefaultSearchOptionsName() {
    return null;
  }
}

const PATTERN_NAME_HOP_INVERSE = 'hopInverse';
SearchPatternBase.register(PATTERN_NAME_HOP_INVERSE, new HopInverse());

export { PATTERN_NAME_HOP_INVERSE };
