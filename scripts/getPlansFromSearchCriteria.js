/*
 * Generates an executable Optic plan from search criteria without running the
 * search.  The output is a self-contained script that can be pasted into
 * MarkLogic Query Console and executed independently.
 *
 * Configure the variables below, then run this script in Query Console.
 * The output is the Optic plan source for the selected plan (sorted or
 * unsorted), wrapped in the template that makes it immediately runnable.
 */
'use strict';
import op from '/MarkLogic/optic.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';

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

const { sortedResultsPlan, unsortedResultsPlan } = new SearchCriteriaProcessor()
  .prepare({
    searchCriteria,
    scopeName,
    sortDelimitedStr,
  })
  .buildPlans(preferFragJoins);

const selectedPlan = useSortedPlan ? sortedResultsPlan : unsortedResultsPlan;

// Convert the Optic plan to readable source code with basic formatting:
// - each chained method call on its own line
// - double-quote to single-quote for consistency
const planSource = op
  .toSource(selectedPlan.export())
  .replace(/"/g, "'")
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
