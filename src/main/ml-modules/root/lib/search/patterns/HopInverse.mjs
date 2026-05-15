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
import {
  OPTION_NAME_EAGER_EVALUATION,
  OPTION_NAME_EXCLUDE_SELF_IRI,
  OPTION_NAME_RETURN_VALUES,
} from '../patterns.mjs';
import { SearchCriteriaProcessor } from '../../SearchCriteriaProcessor.mjs';
import { SearchTermConfig } from '../SearchTermConfig.mjs';
import { getSearchTermConfig } from '../../../config/searchTermsConfig.mjs';

class HopInverse extends SearchPatternBase {
  apply(
    searchCriteriaProcessor,
    searchTerm,
    logicType,
    patternOptions,
    requestOptions,
  ) {
    const id = searchTerm.getId();
    const termConfig = searchTerm.getSearchTermConfig();
    const parentIriCol = searchTerm.getParentIriColumn();
    const triFragCol = id + '_triFrag';
    const refFragCol = id + '_frag';
    const predicates = expandPredicates(termConfig.getPredicates());

    // This is the "valuesOnly" implementation for related lists.
    const requestIsForValues = patternOptions.get(
      OPTION_NAME_RETURN_VALUES,
      false,
    );
    if (requestIsForValues && searchTerm.isTopLevel()) {
      return this.#processValuesOnly(
        searchCriteriaProcessor,
        searchTerm,
        patternOptions,
        requestOptions,
      );
    }

    const tri = op.fromTriples([
      op.pattern(
        op.col(id + '_s'),
        predicates,
        op.col(id + '_o'),
        op.fragmentIdCol(triFragCol),
      ),
    ]);

    const right = tri.joinInner(
      searchCriteriaProcessor.processCriteria({
        planCriteria: searchTerm.getCriteria(),
        planScope: termConfig.getTargetScopeName(),
        patternOptions,
        groups: {
          by: [refFragCol],
        },
        parentId: id,
        requestOptions,
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

  // ValuesOnly dispatcher: uses cts.triples fast path when inner criteria is a
  // known IRI (the common related-list case), otherwise falls back to the
  // plan-based approach for complex inner criteria.
  #processValuesOnly(
    searchCriteriaProcessor,
    searchTerm,
    patternOptions,
    requestOptions,
  ) {
    const termConfig = searchTerm.getSearchTermConfig();
    const criteria = searchTerm.getCriteria();

    // Fast path: when the inner term's criteria is a direct IRI, bypass
    // Optic plan construction and use cts.triples for both hops.
    const childTermName =
      SearchCriteriaProcessor.getFirstNonOptionPropertyName(criteria);
    const childId = childTermName
      ? SearchCriteriaProcessor.getChildId(criteria[childTermName])
      : null;
    if (childId) {
      return this.#processValuesViaTriples(
        searchCriteriaProcessor,
        termConfig,
        patternOptions,
        childTermName,
        childId,
      );
    }

    // Fallback for complex inner criteria: full plan construction.
    const id = searchTerm.getId();
    const iriCol = id + '_iri';

    const innerPlan = searchCriteriaProcessor.processCriteria({
      planCriteria: criteria,
      planScope: termConfig.getTargetScopeName(),
      patternOptions,
      groups: null,
      parentId: id,
      requestOptions,
    });

    const innerResults = innerPlan
      .select([iriCol])
      .groupBy([iriCol], [])
      .result()
      .toArray();

    if (innerResults.length === 0) {
      searchCriteriaProcessor.appendValues([]);
      return null;
    }

    const oCol = `${id}_o`;
    const excludeSelfIri = patternOptions.get(
      OPTION_NAME_EXCLUDE_SELF_IRI,
      null,
    );
    const selfFilter = excludeSelfIri
      ? `\n  FILTER(?${oCol} != <${excludeSelfIri}>)`
      : '';
    const sparql = `
${getPrefixesForSPARQL()}
select ?${oCol} where {
  VALUES ?${id}_s {
    ${innerResults.map((row) => `<${row[iriCol]}>`).join('\n    ')}
  }
  ?${id}_s ${formatPredicatesForSPARQL(termConfig.getPredicates(), false)} ?${oCol}${selfFilter}
}`;

    const sparqlResults = op
      .fromSPARQL(sparql, null, { dedup: 'on' })
      .result()
      .toArray();
    searchCriteriaProcessor.appendValues(sparqlResults.map((row) => row[oCol]));
    return null;
  }

  // Fast path: uses cts.triples directly for both hops, eliminating all Optic
  // plan construction and SPARQL compilation overhead.
  #processValuesViaTriples(
    searchCriteriaProcessor,
    termConfig,
    patternOptions,
    childTermName,
    childId,
  ) {
    const childTermConfig = new SearchTermConfig(
      getSearchTermConfig(termConfig.getTargetScopeName(), childTermName),
    );
    const eagerEvaluation = patternOptions.get(
      OPTION_NAME_EAGER_EVALUATION,
      true,
    );
    const tripleOptions = [eagerEvaluation ? 'eager' : 'lazy', 'concurrent'];

    // Phase 1: Inner hop — find subjects with a triple matching the child
    // predicates and the known IRI as object.
    const innerTriples = cts
      .triples(
        [],
        expandPredicates(childTermConfig.getPredicates()),
        sem.iri(childId),
        '=',
        tripleOptions,
      )
      .toArray();

    if (innerTriples.length === 0) {
      searchCriteriaProcessor.appendValues([]);
      return null;
    }

    const innerSubjects = innerTriples.map((t) => sem.tripleSubject(t));

    // Phase 2: Outer hop — navigate from inner subjects via the outer
    // predicates to find related IRIs.
    const outerTriples = cts
      .triples(
        innerSubjects,
        expandPredicates(termConfig.getPredicates()),
        [],
        '=',
        tripleOptions,
      )
      .toArray();

    const excludeSelfIri = patternOptions.get(
      OPTION_NAME_EXCLUDE_SELF_IRI,
      null,
    );
    const seen = new Set();
    const values = [];
    for (const t of outerTriples) {
      const obj = fn.string(sem.tripleObject(t));
      if (obj !== excludeSelfIri && !seen.has(obj)) {
        seen.add(obj);
        values.push(obj);
      }
    }

    searchCriteriaProcessor.appendValues(values);
    return null;
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

const HopInversePattern = Object.freeze(new HopInverse());

export { HopInversePattern };
