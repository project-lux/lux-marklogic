import op from '/MarkLogic/optic.mjs';
import { expandPredicates } from '../prefixUtils.mjs';
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

    // TODO, PERF: Potential optimization.  When the child criteria is a literal IRI
    // (same condition #processValuesOnly checks), both hops could be resolved via
    // cts.triples and injected as op.fromLiterals, avoiding the inner
    // processCriteria call.  This path only compiles one plan, but it could
    // still matter for latency-sensitive queries.  Consider prototyping if
    // profiling shows the inner plan construction is a bottleneck.

    const tri = op.fromTriples([
      op.pattern(
        op.col(id + '_s'),
        predicates,
        op.col(id + '_o'),
        op.fragmentIdCol(triFragCol),
      ),
    ]);

    const right = tri.joinInner(
      scp.processCriteria({
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
    const childQuery = cts.tripleRangeQuery(
      [],
      childPredicates,
      targetIRI,
      '=',
      [],
      1.0,
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
