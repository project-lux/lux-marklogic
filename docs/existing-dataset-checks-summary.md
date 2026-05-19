## **Dataset Validation Scripts**

- [Introduction](#introduction)
- [Scripts Executed Against MarkLogic](#scripts-executed-against-marklogic)
- [Helper Scripts (for comparing output across datasets)](#helper-scripts-for-comparing-output-across-datasets)
- [Backend API Endpoints](#backend-api-endpoints)
  - [Stats (`/ds/lux/stats.mjs`)](#stats-dsluxstatsmjs)
  - [Storage Info (`/ds/lux/storageInfo.mjs`)](#storage-info-dsluxstorageinfomjs)

# Introduction

We have a collection of scripts and endpoints that assist with inspecting a candidate dataset *and comparing* to the production dataset.  Some are run as multiple users (e.g., `lux-endpoint-consumer` and `lux-ypm-endpoint-consumer`) as it's possible for unit-specific regressions and/or document permission errors.

# Scripts Executed Against MarkLogic

| Script | What It Does |
|--------|-------------|
| [`checkPredicates.js`](/scripts/checkPredicates.js) | Estimates the number of documents containing triples for each predicate referenced by the backend's search term, keyword search, and sort configurations. Surfaces predicates configured in code that have **zero** matching documents (default mode), which means those search terms would silently return no results. Can run as multiple users to compare visibility. Output feeds into `comparePredicates.js`. |
| [`comparePredicates.js`](/scripts/comparePredicates.js) | Queries *all* predicates in the dataset's triple index (via Optic `fromTriples`) and compares them against the list of predicates referenced in code (pasted from a prior `checkPredicates.js` run). Reports two lists: **predicates that exist in data but aren't used by any search term**, and **predicates configured in code but missing from the data**. |
| [`getRangeIndexValueCounts.js`](/scripts/getRangeIndexValueCounts.js) | Enumerates every field range index defined on the content database and counts the distinct values in each. Flags any **empty range indexes** — indexes that exist in the database configuration but contain no values, indicating missing data or a stale index definition. |
| [`getRecordTypesByPredicates.js`](/scripts/getRecordTypesByPredicates.js) | For each predicate referenced by a search term, determines which **record types** (agent, work, item, etc.) have documents containing that predicate. Useful for spotting shifts — e.g., a predicate that used to appear on `work` records no longer does. |
| [`indexComparisonChecks.js`](/scripts/generateIndexConf/indexComparisonChecks.js) | Cross-references the fields and field range indexes **defined in the database** against those **referenced in code** (search terms, facets, sort bindings, auto-complete). Reports four lists: missing fields, unused fields, missing field range indexes, and unused field range indexes. Catches drift between code and database configuration. |

# Helper Scripts (for comparing output across datasets)

| Script | What It Does |
|--------|-------------|
| [`compareCounts.js`](/scripts/compareCounts.js) | Takes the numeric output from `checkPredicates.js` or `getRangeIndexValueCounts.js` for **two datasets** (production vs. candidate) and computes the difference for each key. Quickly shows which predicates or indexes gained or lost documents. |
| [`compareArrays.js`](/scripts/compareArrays.js) | Generic two-way array diff. Given two arrays (e.g., URI lists, predicate lists), returns items only in array 1 and items only in array 2. Useful for comparing any list-shaped output between datasets. |

# Backend API Endpoints

We also consume two backend endpoints to get high-level dataset and infrastructure metrics.

## Stats ([`/ds/lux/stats.mjs`](/docs/lux-backend-api-usage.md#stats))

Returns document count estimates broken down by search scope. Useful for a quick sanity check that each record type's count is in the expected range after a data load. Accepts an optional `unitName` parameter (e.g., `ypm`) to get estimates scoped to a specific unit's document permissions.

Sample response:

```json
{
  "estimates": {
    "searchScopes": {
      "agent": 5649718,
      "concept": 4649130,
      "event": 153318,
      "item": 17545158,
      "place": 579366,
      "reference": 11031350,
      "set": 305353,
      "work": 13560980
    }
  },
  "metadata": {
    "timestamp": "2025-01-10T13:09:20.2",
    "milliseconds": 9
  }
}
```

## Storage Info ([`/ds/lux/storageInfo.mjs`](/docs/lux-backend-api-usage.md#storage-info))

Returns a per-host, per-volume summary of storage usage across the MarkLogic cluster. Reports actual and reserved space for forests, journals, and large data, plus remaining and unreserved space. Includes a warning/critical message when thresholds are crossed. Useful for confirming that a new dataset hasn't pushed the cluster into a low-storage state.

Sample response:

```json
{
    "10.5.156.123": {
        "/var/opt/MarkLogic": {
            "forestsActualGb": 704.9208984375,
            "forestsReserveGb": 193.279296875,
            "journalsActualGb": 3.9755859375,
            "journalsReserveGb": 8.0341796875,
            "largeDataActualGb": 0,
            "perVolumeOtherReserveGb": 2,
            "totalKnownUsedGb": 708.896484375,
            "totalReservedGb": 203.3134765625,
            "spaceRemainingGb": 664.974609375,
            "unreservedRemainingGb": 461.6611328125,
            "approximateUnreservedRemainingPercent": 33.6029438942768,
            "message": "WARNING: There is 33.6% space left, which is more than the warning high threshold of 25%. Consider reducing the volume size."
        }
    }
}
```
