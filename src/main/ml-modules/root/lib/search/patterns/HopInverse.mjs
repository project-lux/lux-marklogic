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
  OPTION_NAME_EXCLUDE_SELF_IRI,
  OPTION_NAME_RETURN_VALUES,
} from '../patterns.mjs';

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

  // Two-phase valuesOnly implementation: executes inner plan to get intermediate
  // IRIs, then uses SPARQL VALUES to navigate the outer hop. Modeled after
  // HopWithField's #processTransitiveHopWithFieldTerm.
  #processValuesOnly(
    searchCriteriaProcessor,
    searchTerm,
    patternOptions,
    requestOptions,
  ) {
    const id = searchTerm.getId();
    const termConfig = searchTerm.getSearchTermConfig();
    const parentIriCol = searchTerm.getParentIriColumn();
    const iriCol = id + '_iri';

    const innerPlan = searchCriteriaProcessor.processCriteria({
      planCriteria: searchTerm.getCriteria(),
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
