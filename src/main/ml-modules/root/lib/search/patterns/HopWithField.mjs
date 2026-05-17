import op from '/MarkLogic/optic.mjs';
import { SEARCH_OPTIONS_NAME_KEYWORD } from '../../appConstants.mjs';
import { SearchCriteriaProcessor as SCP } from '../../SearchCriteriaProcessor.mjs';
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

class HopWithField extends SearchPatternBase {
  //#region Pattern implementation methods.
  apply(scp, searchTerm, logicType, patternOptions) {
    if (searchTerm.getSearchTermConfig().isTransitive()) {
      return this.#processTransitiveHopWithFieldTerm(
        scp,
        searchTerm,
        patternOptions,
      );
    } else {
      return this.#processHopWithFieldTerm(scp, searchTerm, patternOptions);
    }
  }

  // Approach: embeds field plan's results into SPARQL.  Proven over 3x faster in 12.0.1 than
  // hopPlan.joinInner(fieldPlan) when the embedded approach included the transitive operator (+)
  // and the join approach did not.
  //
  // TODO: is there a limit on the number of IRIs we can embed and if so, can the likes of op.param
  // or op.fromLiterals get around that?  Perhaps test with words that match 100K+ docs.
  #processTransitiveHopWithFieldTerm(scp, searchTerm, patternOptions) {
    const hopIriCol = searchTerm.getParentIriColumn();
    const fieldIriCol = searchTerm.getIriColumn();
    const termConfig = searchTerm.getSearchTermConfig();
    const id = searchTerm.getId();

    // Get the subject IRIs from the inner query and apply as an object IRI constraint in the SPARQL query.
    const fieldPlan = searchTerm.hasValue() // inverse of searchTerm.hasCriteria()
      ? this.#getFieldAtomicPlan(scp, searchTerm, patternOptions)
      : this.#getFieldNestedPlan(scp, searchTerm, patternOptions);

    // TODO: if there are zero results from the fieldPlan, should we do anything different?
    const sparql = `
${getPrefixesForSPARQL()}
select ?${id}_s ?${id}_o where {
  VALUES ?${id}_o {
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
          on: [op.on(op.col(hopIriCol), op.col(id + '_s'))],
          extraCols: [],
        },
      ],
    };
  }

  #processHopWithFieldTerm(scp, searchTerm, patternOptions) {
    const id = searchTerm.getId();
    const termValue = searchTerm.getValue();
    const termConfig = searchTerm.getSearchTermConfig();
    const hopIriCol = searchTerm.getParentIriColumn();
    const fieldIriCol = searchTerm.getIriColumn();
    const hopFragCol = searchTerm.getParentFragmentColumn();
    const hopTripleFragCol = id + '_hopFrag';

    // When criteria is a direct IRI ({ iri: value } or { id: value }),
    // use it in the triple pattern instead of a full lexicon scan.
    const childId = SCP.getChildId(searchTerm.getCriteria());
    if (!termValue && childId) {
      const hopPlan = op.fromTriples([
        op.pattern(
          op.col(id + '_s'),
          expandPredicates(termConfig.getPredicates()),
          sem.iri(childId),
          op.fragmentIdCol(hopTripleFragCol),
        ),
      ]);
      return {
        patternJoins: [
          {
            right: hopPlan,
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

    const hopPlan = op.fromTriples([
      op.pattern(
        op.col(id + '_s'),
        expandPredicates(termConfig.getPredicates()),
        op.col(id + '_o'),
        op.fragmentIdCol(hopTripleFragCol),
      ),
    ]);

    const fieldPlan = termValue
      ? this.#getFieldAtomicPlan(scp, searchTerm, patternOptions)
      : this.#getFieldNestedPlan(scp, searchTerm, patternOptions);

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

  #getFieldNestedPlan(scp, searchTerm, patternOptions) {
    const termConfig = searchTerm.getSearchTermConfig();
    return scp.processCriteria({
      planCriteria: searchTerm.getCriteria(),
      planScope: termConfig.getTargetScopeName(),
      patternOptions: null, // Do not pass on this term's pattern options.
      groups: null, // groupBy here prevents grouping by at the end.
      parentId: searchTerm.getId(),
    });
  }

  #getFieldAtomicPlan(scp, searchTerm, patternOptions) {
    const id = searchTerm.getId();
    const termValue = searchTerm.getValue();
    const termSearchOptions = searchTerm.getSearchOptions();
    const termConfig = searchTerm.getSearchTermConfig();
    const fieldIriCol = searchTerm.getIriColumn();
    const fieldCol = id + '_field';
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

const PATTERN_NAME_HOP_WITH_FIELD = 'hopWithField';
SearchPatternBase.register(PATTERN_NAME_HOP_WITH_FIELD, new HopWithField());

export { PATTERN_NAME_HOP_WITH_FIELD };
