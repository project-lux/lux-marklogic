import op from '/MarkLogic/optic.mjs';
import { SearchCriteriaProcessor as SCP } from '../../SearchCriteriaProcessor.mjs';
import {
  formatPredicatesForSPARQL,
  getPrefixesForSPARQL,
} from '../prefixUtils.mjs';
import { SearchPatternBase } from './SearchPatternBase.mjs';

class HopBase extends SearchPatternBase {
  // Approach: embeds field plan's results into SPARQL.  Proven over 3x faster in 12.0.1 than
  // hopPlan.joinInner(fieldPlan) when the embedded approach included the transitive operator (+)
  // and the join approach did not.
  //
  // TODO: is there a limit on the number of IRIs we can embed and if so, can the likes of op.param
  // or op.fromLiterals get around that?  Perhaps test with words that match 100K+ docs.
  processTransitiveHopTerm(scp, searchTerm, patternOptions, inverse) {
    const hopIriCol = searchTerm.getParentIriColumn();
    const fieldIriCol = searchTerm.getIriColumn();
    const termConfig = searchTerm.getSearchTermConfig();
    const id = searchTerm.getId();

    // Get the subject IRIs from the inner query and apply as an object IRI constraint in the SPARQL query.
    const fieldPlan = searchTerm.hasValue() // inverse of searchTerm.hasCriteria()
      ? this.getFieldAtomicPlan(scp, searchTerm, patternOptions)
      : this.getFieldNestedPlan(scp, searchTerm, patternOptions);

    const sparql = `
${getPrefixesForSPARQL()}
select ?${id}_s ?${id}_o where {
  VALUES ?${id}${inverse ? '_s' : '_o'} {
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
          on: [op.on(op.col(hopIriCol), op.col(id + (inverse ? '_o' : '_s')))],
          extraCols: [],
        },
      ],
    };
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
  getFieldNestedPlan(scp, searchTerm, patternOptions) {
    const termConfig = searchTerm.getSearchTermConfig();
    return scp.processNestedCriteria({
      planCriteria: searchTerm.getCriteria(),
      planScope: termConfig.getTargetScopeName(),
      patternOptions: SCP.initializePatternOptions(),
      parentId: searchTerm.getId(),
    });
  }

  getFieldAtomicPlan(scp, searchTerm, patternOptions) {
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
}

export { HopBase };
