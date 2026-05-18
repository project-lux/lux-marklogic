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
//   includeTypeConstraint [execute-only]  - TBD whether this will be implemented in Optic.s
//   includeSearchResults  [execute-only]  - controls whether execute() fetches result rows
//   page                  [execute-only]  - pagination offset
//   pageLength            [execute-only]  - pagination limit
//   pageWith              [execute-only]  - find page containing a specific document
//   filterResults         [execute-only]  - TBD whether this will be implemented in Optic.
//   facetRequests         [execute-only]  - Instance of FacetRequests
const { sortedResultsPlan, unsortedResultsPlan } = new SCP()
  .prepare({
    searchCriteria,
    scopeName,
    sortDelimitedStr,
  })
  .buildPlans(preferFragJoins);

const selectedPlan = useSortedPlan ? sortedResultsPlan : unsortedResultsPlan;

// Convert the Optic plan to readable source code with basic formatting:
// - each chained method call on its own line
const planSource = op
  .toSource(selectedPlan.export())
  .replace(/\)\s*\./g, ')\n  .');

// Assemble the executable template.
const script = `import op from 'MarkLogic/optic.mjs';

const selectedPlan = ${planSource}

const offset = ${offset};
const limit = ${limit};
const results = selectedPlan.offset(offset).limit(limit).result().toArray();
export default results;
`;

const output = andExecute
  ? {
      script,
      results: selectedPlan.offset(offset).limit(limit).result().toArray(),
    }
  : script;

output;
export default output;
