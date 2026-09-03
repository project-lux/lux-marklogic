import op from '/MarkLogic/optic.mjs';
import { expandPredicates } from '/lib/search/prefixUtils.mjs';
import { SEARCH_OPTIONS_NAME_KEYWORD } from '/lib/appConstants.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import {
  CHILD_TYPE_GROUP,
  CHILD_TYPE_TERM,
  SearchPatternBase,
} from '/lib/search/patterns/SearchPatternBase.mjs';
import { HopBase } from '/lib/search/patterns/HopBase.mjs';

class HopWithField extends HopBase {
  //#region Pattern implementation methods.
  apply(scp, searchTerm, logicType, patternOptions) {
    if (searchTerm.getSearchTermConfig().isTransitive()) {
      return this.processTransitiveHopTerm(
        scp,
        searchTerm,
        patternOptions,
        false,
      );
    } else {
      return this.#processHopWithFieldTerm(scp, searchTerm, patternOptions);
    }
  }

  #processHopWithFieldTerm(scp, searchTerm, patternOptions) {
    const id = searchTerm.getId();
    const termValue = searchTerm.getValue();
    const termConfig = searchTerm.getSearchTermConfig();
    const hopIriCol = searchTerm.getParentIriColumn();
    const fieldIriCol = searchTerm.getIriColumn();
    const hopFragCol = searchTerm.getParentFragmentColumn();
    const termSearchOptions = []; // only use search options in fieldWordQuery.
    const termWeight = searchTerm.getWeight();
    const hopTripleFragCol = id + '_hopFrag';

    // When criteria is a direct IRI ({ iri: value } or { id: value }) and no
    // idIndexReferences exist (the engine rewrite didn't fire), resolve via
    // cts.tripleRangeQuery with the IRI as a document-backed object constraint.
    const childId = SCP.getChildId(searchTerm.getCriteria());
    if (!termValue && childId) {
      return {
        ctsConstraints: [
          cts.tripleRangeQuery(
            [],
            expandPredicates(termConfig.getPredicates()),
            fn.insertBefore(
              cts.values(
                cts.iriReference(),
                '',
                ['eager', 'concurrent'],
                cts.documentQuery(childId),
              ),
              0,
              sem.iri('/does/not/exist'),
            ),
            '=',
            termSearchOptions,
            termWeight,
          ),
        ],
      };
    }

    // When criteria is nested, attempt to resolve the inner criteria as a pure
    // CTS query. If successful, emit cts.tripleRangeQuery with cts.values to
    // resolve object IRIs — avoiding the Optic fromTriples join entirely.
    // When the inner criteria matches too many documents, the materialized IRIs
    // bloat the plan AST and cause expensive optimizer traversal on cold start.
    // In that case, fall through to the Optic join path which keeps the plan
    // AST small at the cost of a runtime join.
    if (!termValue) {
      const innerCts = scp.processNestedCriteriaAsCts({
        planCriteria: searchTerm.getCriteria(),
        planScope: termConfig.getTargetScopeName(),
        patternOptions: SCP.initializePatternOptions(),
        parentId: searchTerm.getId(),
      });
      if (innerCts) {
        return {
          ctsConstraints: [
            cts.tripleRangeQuery(
              [],
              expandPredicates(termConfig.getPredicates()),
              fn.insertBefore(
                cts.values(
                  cts.iriReference(),
                  '',
                  ['eager', 'concurrent'],
                  innerCts,
                ),
                0,
                sem.iri('/does/not/exist'),
              ),
              '=',
              termSearchOptions,
              termWeight,
            ),
          ],
        };
      }
    }

    // Fallback: Optic join path (when inner criteria requires joins).
    const hopPlan = op.fromTriples([
      op.pattern(
        op.col(id + '_s'),
        expandPredicates(termConfig.getPredicates()),
        op.col(id + '_o'),
        op.fragmentIdCol(hopTripleFragCol),
      ),
    ]);

    const fieldPlan = termValue
      ? this.getFieldAtomicPlan(scp, searchTerm, patternOptions)
      : this.getFieldNestedPlan(scp, searchTerm, patternOptions);

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

  //#endregion

  mayTokenizeValue() {
    return false;
  }

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
