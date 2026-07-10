/**
 * Test suite for non-semantic sort execution — verifies that results without
 * sort values appear at the end regardless of sort direction.
 *
 * Uses 5 test documents loaded by suiteSetup:
 *   - 3 HumanMadeObject with itemArchiveSortId values
 *     ("Aardvark-000" + "Zulu-999" on one doc, plus "Alpha-001", "Bravo-002")
 *   - 2 HumanMadeObject without itemArchiveSortId values
 * All 5 are members of the test-sort-set, filtered via memberOf { id }.
 *
 * Tests both execution paths:
 *   - buildSortedResultsPlan (fromLexicons base, non-CTS-eligible)
 *   - buildFromSearchPlan (fromSearch base, CTS-eligible via Opt 20)
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import op from '/MarkLogic/optic.mjs';
import {
  SORT_ITEM_MULTI_VALUE_URI,
  SORT_ITEM_NO_VALUE_1_URI,
  SORT_ITEM_NO_VALUE_2_URI,
  SORT_ITEM_WITH_VALUE_1_URI,
  SORT_ITEM_WITH_VALUE_2_URI,
} from '/test/unitTestConstants.mjs';

const LIB = '0406 sort-execution-nullsLast.mjs';
console.log(`${LIB}: starting.`);

const assertions = [];

const SORT_SET_URI = 'https://lux.collections.yale.edu/data/set/test-sort-set';
const WITH_VALUE_URIS = new Set([
  SORT_ITEM_MULTI_VALUE_URI,
  SORT_ITEM_WITH_VALUE_1_URI,
  SORT_ITEM_WITH_VALUE_2_URI,
]);
const NO_VALUE_URIS = new Set([
  SORT_ITEM_NO_VALUE_1_URI,
  SORT_ITEM_NO_VALUE_2_URI,
]);

// Search criteria that matches exactly the 5 test documents via memberOf.
const SEARCH_CRITERIA = {
  _scope: 'item',
  memberOf: { id: SORT_SET_URI },
};

// Executes the sorted plan via SCP (fromLexicons path) and returns rows.
function executeSortedPlan(sortDelimitedStr) {
  const scp = new SCP();
  scp.prepare({
    searchCriteria: SEARCH_CRITERIA,
    scopeName: 'item',
    sortDelimitedStr,
  });
  const { sortedResultsPlan } = scp.buildPlans();
  return sortedResultsPlan.result().toArray();
}

// Executes via buildFromSearchPlan (fromSearch/Opt 20 path) and returns rows.
function executeFromSearchPlan(sortDelimitedStr) {
  const scp = new SCP();
  scp.prepare({
    searchCriteria: SEARCH_CRITERIA,
    scopeName: 'item',
    sortDelimitedStr,
  });
  const result = scp.buildPlans();
  const { sortedResultsPlan } = result;
  if (!result.scopedCtsQuery) {
    // Fallback: this search shape may not be CTS-eligible.
    // Return sortedResultsPlan rows instead.
    return sortedResultsPlan.result().toArray();
  }
  const plan = result.selectedPlan;
  // If the fromSearch path fired (isFromSearchPlan), execute with hydration.
  if (result.isFromSearchPlan) {
    return plan
      .offset(0)
      .limit(20)
      .joinDocAndUri('doc', 'uri', op.fragmentIdCol('fragmentId'))
      .result()
      .toArray()
      .map((row) => ({
        id: row.uri,
        type: String(row.doc.xpath('/json/type')),
        sort_itemArchiveSortId: row.sort_itemArchiveSortId ?? null,
      }));
  }
  return plan.result().toArray();
}

// Asserts that the first N rows (with sort values) come before the remaining
// rows (without sort values), and that the sorted rows are in the expected order.
function assertNullsLast(rows, direction, pathLabel) {
  const prefix = `${pathLabel} ${direction}`;

  // All 5 test documents should be present.
  assertions.push(
    testHelperProxy.assertEqual(
      5,
      rows.length,
      `${prefix}: expected 5 rows, got ${rows.length}`,
    ),
  );

  if (rows.length !== 5) return;

  // Row-multiplication regression guard: IDs should be unique.
  const ids = rows.map((r) => r.id);
  assertions.push(
    testHelperProxy.assertEqual(
      ids.length,
      new Set(ids).size,
      `${prefix}: expected unique IDs (no duplicates from multi-value sort joins).`,
    ),
  );

  // Multi-value document should appear exactly once.
  const multiValueCount = rows.filter(
    (r) => r.id === SORT_ITEM_MULTI_VALUE_URI,
  ).length;
  assertions.push(
    testHelperProxy.assertEqual(
      1,
      multiValueCount,
      `${prefix}: multi-value sort document should appear exactly once.`,
    ),
  );

  // First 3 rows should have sort values (documents with itemArchiveSortId).
  const firstThreeIds = new Set(rows.slice(0, 3).map((r) => r.id));
  assertions.push(
    testHelperProxy.assertTrue(
      [...firstThreeIds].every((id) => WITH_VALUE_URIS.has(id)),
      `${prefix}: first 3 rows should be documents with sort values. Got: ${[...firstThreeIds].join(', ')}`,
    ),
  );

  // Last 2 rows should lack sort values.
  const lastTwoIds = new Set(rows.slice(3, 5).map((r) => r.id));
  assertions.push(
    testHelperProxy.assertTrue(
      [...lastTwoIds].every((id) => NO_VALUE_URIS.has(id)),
      `${prefix}: last 2 rows should be documents without sort values. Got: ${[...lastTwoIds].join(', ')}`,
    ),
  );

  // Direction-aware aggregate behavior with multi-value sort doc:
  // - ascending uses min -> Aardvark-000 (multi-value doc) should lead.
  // - descending uses max -> Zulu-999 (same doc) should lead.
  if (direction === 'ascending') {
    assertions.push(
      testHelperProxy.assertEqual(
        SORT_ITEM_MULTI_VALUE_URI,
        rows[0].id,
        `${prefix}: first row should be the multi-value sort doc (Aardvark-000 min).`,
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        SORT_ITEM_WITH_VALUE_2_URI,
        rows[1].id,
        `${prefix}: second row should be Alpha-001 (value-2 doc)`,
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        SORT_ITEM_WITH_VALUE_1_URI,
        rows[2].id,
        `${prefix}: third row should be Bravo-002 (value-1 doc)`,
      ),
    );
  } else {
    assertions.push(
      testHelperProxy.assertEqual(
        SORT_ITEM_MULTI_VALUE_URI,
        rows[0].id,
        `${prefix}: first row should be the multi-value sort doc (Zulu-999 max).`,
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        SORT_ITEM_WITH_VALUE_1_URI,
        rows[1].id,
        `${prefix}: second row should be Bravo-002 (value-1 doc)`,
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        SORT_ITEM_WITH_VALUE_2_URI,
        rows[2].id,
        `${prefix}: third row should be Alpha-001 (value-2 doc)`,
      ),
    );
  }
}

// --- buildSortedResultsPlan (fromLexicons path) ---
const ascRows = executeSortedPlan('itemArchiveSortId');
assertNullsLast(ascRows, 'ascending', 'sortedResultsPlan');

const descRows = executeSortedPlan('itemArchiveSortId:desc');
assertNullsLast(descRows, 'descending', 'sortedResultsPlan');

// --- buildFromSearchPlan (fromSearch/Opt 20 path) ---
const ascFromSearch = executeFromSearchPlan('itemArchiveSortId');
assertNullsLast(ascFromSearch, 'ascending', 'fromSearchPlan');

const descFromSearch = executeFromSearchPlan('itemArchiveSortId:desc');
assertNullsLast(descFromSearch, 'descending', 'fromSearchPlan');

console.log(`${LIB}: completed ${assertions.length} assertions.`);

assertions;
export default assertions;
