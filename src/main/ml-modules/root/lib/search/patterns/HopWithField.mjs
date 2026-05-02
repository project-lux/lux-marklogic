import op from '/MarkLogic/optic.mjs';
import { SEARCH_OPTIONS_NAME_KEYWORD } from '../../appConstants.mjs';
import { SearchCriteriaProcessor } from '../../SearchCriteriaProcessor.mjs';
import {
  CHILD_TYPE_GROUP,
  CHILD_TYPE_TERM,
  SearchPatternBase,
} from './SearchPatternBase.mjs';

class HopWithField extends SearchPatternBase {
  //#region Pattern implementation methods.
  apply(
    searchCriteriaProcessor,
    searchTerm,
    logicType,
    patternOptions,
    requestOptions,
  ) {
    if (searchTerm.getSearchTermConfig().isTransitive()) {
      return this.#processTransitiveHopWithFieldTerm(
        searchCriteriaProcessor,
        searchTerm,
        patternOptions,
        requestOptions,
      );
    } else {
      return this.#processHopWithFieldTerm(
        searchCriteriaProcessor,
        searchTerm,
        patternOptions,
        requestOptions,
      );
    }
  }

  // Approach: embeds field plan's results into SPARQL.  Proven over 3x faster in 12.0.1 than
  // hopPlan.joinInner(fieldPlan) when the embedded approach included the transitive operator (+)
  // and the join approach did not.
  //
  // TODO: is there a limit on the number of IRIs we can embed and if so, can the likes of op.param
  // or op.fromLiterals get around that?  Perhaps test with words that match 100K+ docs.
  #processTransitiveHopWithFieldTerm(
    searchCriteriaProcessor,
    searchTerm,
    patternOptions,
    requestOptions,
  ) {
    const hopIriCol = searchTerm.getParentIriColumn();
    const fieldIriCol = searchTerm.getIriColumn();
    console.log(
      `processTransitiveHopWithFieldTerm: hopIriCol=${hopIriCol}, fieldIriCol=${fieldIriCol}`,
    );
    const termConfig = searchTerm.getSearchTermConfig();
    const id = searchTerm.getId();

    // Get the subject IRIs from the inner query and apply as an object IRI constraint in the SPARQL query.
    const fieldPlan = searchTerm.hasValue() // inverse of searchTerm.hasChildCriteria()
      ? this.#getFieldAtomicPlan(
          searchCriteriaProcessor,
          searchTerm,
          patternOptions,
          requestOptions,
        )
      : this.#getFieldNestedPlan(
          searchCriteriaProcessor,
          searchTerm,
          patternOptions,
          requestOptions,
        );
    // DEBUG.push(`Transitive fieldPlan: ${getPlanSource(fieldPlan)}`);

    // TODO: if there are zero results from the fieldPlan, should we do anything different?
    const sparql = `
${SearchCriteriaProcessor.getPrefixesForSPARQL()}
select ?${id}_s ?${id}_o where {
  VALUES ?${id}_o {
    ${fieldPlan
      .result()
      .toArray()
      .map((row) => `<${row[fieldIriCol]}>`)
      .join('\n    ')}
  }
  ?${id}_s ${SearchCriteriaProcessor.formatPredicatesForSPARQL(termConfig.getPredicates())} ?${id}_o
}`;

    return {
      patternJoins: [
        {
          right: op.fromSPARQL(sparql, null, { dedup: 'on' }),
          on: [op.on(op.col(hopIriCol), op.col(id + '_s'))],
          extraCols: [],
        },
      ],
    };
  }

  #processHopWithFieldTerm(
    searchCriteriaProcessor,
    searchTerm,
    patternOptions,
    requestOptions,
  ) {
    const id = searchTerm.getId();
    const termValue = searchTerm.getValue();
    const termConfig = searchTerm.getSearchTermConfig();
    const hopIriCol = searchTerm.getParentIriColumn();
    const fieldIriCol = searchTerm.getIriColumn();
    console.log(
      `processHopWithFieldTerm: hopIriCol=${hopIriCol}, fieldIriCol=${fieldIriCol}`,
    );
    const hopFragCol = searchTerm.getParentFragmentColumn();
    const hopTripleFragCol = id + '_hopFrag';
    const hopPlan = op.fromTriples([
      op.pattern(
        op.col(id + '_s'),
        SearchCriteriaProcessor.expandPredicates(termConfig.getPredicates()),
        op.col(id + '_o'),
        op.fragmentIdCol(hopTripleFragCol),
      ),
    ]);

    const fieldPlan = termValue
      ? this.#getFieldAtomicPlan(
          searchCriteriaProcessor,
          searchTerm,
          patternOptions,
          requestOptions,
        )
      : this.#getFieldNestedPlan(
          searchCriteriaProcessor,
          searchTerm,
          patternOptions,
          requestOptions,
        );

    // DEBUG.push('Generated right plan:');
    // DEBUG.push(getPlanSource(right));

    return {
      patternJoins: [
        {
          right: hopPlan.joinInner(
            fieldPlan,
            op.on(op.col(id + '_o'), op.col(fieldIriCol)),
          ),
          // op.fromTriples doesn't return URIs so we are using fragment regardless of config
          on: [
            op.on(op.col(hopIriCol), op.col(id + '_s')),
            op.on(
              op.fragmentIdCol(hopFragCol),
              op.fragmentIdCol(hopTripleFragCol),
            ),
          ],
          extraCols: [],
        },
      ],
    };
  }

  #getFieldNestedPlan(
    searchCriteriaProcessor,
    searchTerm,
    patternOptions,
    requestOptions,
  ) {
    console.log(`GET FIELD NESTED PLAN`);
    const termConfig = searchTerm.getSearchTermConfig();
    return searchCriteriaProcessor.processCriteria({
      searchCriteriaProcessor,
      planCriteria: searchTerm.getChildCriteria(),
      planScope: termConfig.getTargetScopeName(),
      patternOptions: null, // Do not pass on this term's pattern options.
      groups: null, // groupBy here prevents grouping by at the end.
      parentId: searchTerm.getId(),
    });
  }

  #getFieldAtomicPlan(
    searchCriteriaProcessor,
    searchTerm,
    patternOptions,
    requestOptions,
  ) {
    console.log(`GET FIELD ATOMIC PLAN`);
    const id = searchTerm.getId();
    const termValue = searchTerm.getValue();
    const termSearchOptions = searchTerm.getSearchOptions();
    const termConfig = searchTerm.getSearchTermConfig();
    const fieldIriCol = searchTerm.getIriColumn();
    const fieldCol = id + '_field';
    console.log(
      `getFieldAtomicPlan: parentIriCol=${searchTerm.getParentIriColumn()}, fieldIriCol=${fieldIriCol}`,
    );
    return searchTerm.isCompleteMatch()
      ? op
          .fromLexicons({
            [fieldIriCol]: cts.iriReference(),
            // TODO: determine if support for a single index is an issue.
            [fieldCol]: cts.fieldReference(termConfig.getIndexReferences()[0]),
          })
          .where(op.eq(op.col(fieldCol), termValue))
      : op
          .fromLexicons({
            [fieldIriCol]: cts.iriReference(),
          })
          .where(
            cts.fieldWordQuery(
              termConfig.getIndexReferences(),
              termValue,
              termSearchOptions,
            ),
          );
  }
  //#endregion

  // Runtime property names expected on SearchTerm props (without leading underscore).
  // This pattern currently has no required runtime properties.
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
    return SEARCH_OPTIONS_NAME_KEYWORD;
  }

  getDefaultSearchOptionsName() {
    return SEARCH_OPTIONS_NAME_KEYWORD;
  }
}

const HopWithFieldPattern = Object.freeze(new HopWithField());

export { HopWithFieldPattern };
