/*
 * Generates an executable Optic plan from search criteria without running
 * SCP's execute() or executeForValues().  Instead, it stops at buildPlans()
 * to obtain the compiled plan, converts it to readable source, and wraps it
 * in a self-contained script for MarkLogic Query Console.
 *
 * When andExecute is true, this script also runs the plan directly (bypassing
 * SCP's execute path) so you can inspect both the plan and its results.
 *
 * Configure the variables below, then run this script in Query Console.
 */
'use strict';
import op from '/MarkLogic/optic.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';

//#region Developer configuration

// searchCriteria: the search criteria to convert.  Both search grammars are
// supported (JSON grammar and string grammar).
const searchCriteria = {
  _scope: 'place',
  regionRelates:
    'POLYGON ((-99.20574999999999 19.29684, -99.09908 19.29684, -99.09908 19.35957, -99.20574999999999 19.35957, -99.20574999999999 19.29684))',
};

// scopeName: required by the string search grammar and when not specified
// by the _scope property in the JSON search grammar.
const scopeName = null;

// Join on fragments or URIs?
const preferFragJoins = false;

// useSortedPlan: true for the sorted plan, false for the unsorted plan.
const useSortedPlan = true;

// sortDelimitedStr: sort specification (e.g., 'anySortName:desc').
const sortDelimitedStr = '';

// offset and limit for the executable template output.
const offset = 0;
const limit = 20;

// andExecute: when true, also execute the plan and return results alongside
// the generated script.  When false, only the script is returned.
const andExecute = false;

//#endregion

// prepare() accepts these parameters; those marked [buildPlans] affect plan
// generation, while those marked [execute-only] only matter for execute():
//
//   searchCriteria        [buildPlans]    - JSON or string grammar search input
//   scopeName             [buildPlans]    - overrides _scope in criteria
//   sortDelimitedStr      [buildPlans]    - sort spec influences sortedResultsPlan
//   allowMultiScope       [buildPlans]    - must be true for scope 'multi'
//   patternOptions        [buildPlans]    - Instance of PatternOptions
//   includeTypeConstraint [execute-only]  - TBD whether this will be implemented in Optic
//   includeSearchResults  [both]          - buildPlans uses for strategy; execute uses for fetching
//   page                  [execute-only]  - pagination offset
//   pageLength            [execute-only]  - pagination limit
//   pageWith              [both]          - buildPlans uses for strategy; execute uses for pagination
//   filterResults         [execute-only]  - TBD whether this will be implemented in Optic
//   facetRequests         [both]          - buildPlans uses for strategy; execute uses for facet computation
//
// engine.buildPlans returns 6 properties:
//   sortedResultsPlan    — plan with sort applied (inspection)
//   unsortedResultsPlan  — plan without sort (inspection, facets)
//   scopedCtsQuery       — scoped CTS query for cts.estimate/cts.search, or null if joins required
//   selectedPlan         — the Optic plan (for inspection; may not execute when ctsSearchOptions is set)
//   ctsExecutionEligible — whether Opt 18/26/21 apply
//   ctsSearchOptions     — when non-null, cts.search executes with these options instead of the Optic plan
const buildPlansResult = new SCP()
  .prepare({
    searchCriteria,
    scopeName,
    sortDelimitedStr,
  })
  .buildPlans(preferFragJoins);

const {
  sortedResultsPlan,
  unsortedResultsPlan,
  scopedCtsQuery,
  selectedPlan,
  ctsExecutionEligible,
  ctsSearchOptions,
} = buildPlansResult;

// The developer's chosen plan for the script template.
const requestedPlan = useSortedPlan ? sortedResultsPlan : unsortedResultsPlan;

// Which Optic plan would performSearch use when cts.search is not active?
const opticPlanSource = selectedPlan
  ? op
      .toSource(selectedPlan.export())
      .replace(/op\.fromSPARQL\('([\s\S]*?)'/g, 'op.fromSPARQL(`$1`')
      .replace(/\)\s*\./g, ')\n  .')
  : null;

// Convert the Optic plan to readable source code with basic formatting:
// - SPARQL strings converted to template literals for valid multi-line JS
// - each chained method call on its own line
const planSource = op
  .toSource(requestedPlan.export())
  .replace(/op\.fromSPARQL\('([\s\S]*?)'/g, 'op.fromSPARQL(`$1`')
  .replace(/\)\s*\./g, ')\n  .');

// CTS execution eligibility and estimate count.
const estimateCount = ctsExecutionEligible
  ? Number(cts.estimate(scopedCtsQuery))
  : null;

// Assemble the executable template.
const renderedScript = `import op from 'MarkLogic/optic.mjs';

const selectedPlan = ${planSource}

const offset = ${offset};
const limit = ${limit};
const results = selectedPlan.offset(offset).limit(limit).result().toArray();
export default results;
`;

const scriptParams = {
  searchCriteria,
  scopeName,
  preferFragJoins,
  useSortedPlan,
  sortDelimitedStr,
  offset,
  limit,
  andExecute,
};

const buildPlansOutput = {
  ctsExecutionEligible,
  ctsSearchOptions: ctsSearchOptions
    ? ctsSearchOptions.map((o) => (typeof o === 'string' ? o : xdmp.quote(o)))
    : null,
  scopedCtsQuerySource: scopedCtsQuery ? xdmp.quote(scopedCtsQuery) : null,
  estimateCount,
  opticPlanSource,
};

const outputWithoutExecution = {
  scriptParams,
  buildPlansOutput,
  renderedScript,
};

const output = andExecute
  ? {
      ...outputWithoutExecution,
      results: requestedPlan.offset(offset).limit(limit).result().toArray(),
    }
  : outputWithoutExecution;
export default output;
