import op from '/MarkLogic/optic.mjs';
import { expandPredicates } from '../prefixUtils.mjs';
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
import { InternalServerError } from '../../errorClasses.mjs';
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

  // Uses cts.triples directly for both hops, eliminating all Optic plan
  // construction and SPARQL compilation overhead.
  #processValuesOnly(searchCriteriaProcessor, searchTerm, patternOptions) {
    const termConfig = searchTerm.getSearchTermConfig();
    const criteria = searchTerm.getCriteria();

    const childTermName =
      SearchCriteriaProcessor.getFirstNonOptionPropertyName(criteria);
    const childId = childTermName
      ? SearchCriteriaProcessor.getChildId(criteria[childTermName])
      : null;
    if (!childId) {
      throw new InternalServerError(
        `HopInverse values-only mode requires criteria with a direct child ID (e.g., { iri: "..." }). Got: ${JSON.stringify(criteria)}`,
      );
    }

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
