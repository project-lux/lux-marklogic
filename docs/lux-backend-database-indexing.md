## **LUX Backend Database Indexing**

- [General Guidance](#general-guidance)
  - [Check for Mismatched Indexing Configuration](#check-for-mismatched-indexing-configuration)
  - [Re-Load vs. Re-Index](#re-load-vs-re-index)
  - [Detecting Conflicts Between Data and Index Configuration](#detecting-conflicts-between-data-and-index-configuration)
- [Fields and Field Range Indexes](#fields-and-field-range-indexes)
  - [Database-Level Field Index Defaults](#database-level-field-index-defaults)
  - [Field Index Patterns](#field-index-patterns)
    - [Keyword](#keyword)
    - [Exact Match](#exact-match)
    - [Exclusive Support of Field Range Indexes](#exclusive-support-of-field-range-indexes)
  - [Fields with Range Indexes](#fields-with-range-indexes)

# General Guidance

## Check for Mismatched Indexing Configuration

After updating the database indexing configuration and before re-loading the data, check to see if the code references fields and field range indexes that the database does not offer.  This may be done by running [/scripts/generateIndexConf/indexComparisonChecks.js](/scripts/generateIndexConf/indexComparisonChecks.js) in the Query Console of the target environment.  The script accounts for index references within [/src/main/ml-modules/base/root/config](/src/main/ml-modules/base/root/config) and checks for:

* The code references fields or field range indexes that are not configured in the database, opening us up to **runtime errors**.
* The database configures fields or field range indexes that are not referenced by the code, leading to larger memory and storage footprints than necessary.

Example return:

```
{
   "missing":{
      "fields":[
         
      ],
      "fieldRanges":[
         
      ]
   },
   "unused":{
      "fields":[
         "agentName",
         "conceptName",
         "eventName",
         "isCollectionItemBoolean",
         "itemName",
         "languageIdentifier",
         "placeName",
         "placeSpatial",
         "referenceName",
         "setUsedForId",
         "workName"
      ],
      "fieldRanges":[
         "agentName",
         "agentPrimaryName",
         "conceptName",
         "conceptPrimaryName",
         "isCollectionItemBoolean",
         "languageIdentifier",
         "placeName",
         "placePrimaryName",
         "referenceName",
         "referencePrimaryName",
         "setPrimaryName",
         "setUsedForId"
      ]
   }
}
```

## Re-Load vs. Re-Index

When the database index configuration changes, it *can* be quicker to clear the database and load the entire dataset (a.k.a., re-load).  The re-load duration tends to be relatively stable whereas it can be difficult to estimate how long a re-index job will take.  A re-index job's duration depends on how many documents need to be re-indexed, which depends on the index changes being made.

When the field range indexes are configured to *reject* invalid values, there is a second reason to select re-load over re-index: search can error out with "invalid lexical value" should the system attempt to resolve some of the search criterion against a field range index that contains an incompatible value --because that value was present in the database before the latest field range index configuration was applied.  **But**, LUX's field range indexes are configured to ignore invalid values.

## Detecting Conflicts Between Data and Index Configuration

Data can be incompatible with field range indexes as the latter declare a scalar type, such as float.  For example, when the value to index is a string yet the index is configured to accept a float, the property value cannot be included in the field range index.  MarkLogic allows field range indexes to reject or ignore invalid values.  When loading content, reject prevents the document from being loaded.  With ignore, the document is accepted but the invalid values are not added to the field range index(es).  LUX is configured to ignore invalid values, thereby allowing more content in; however, note that documents containing invalid values can be omitted from search results when the search criteria need the associated field range index(es).

When LUX loads the content database, it uses MLCP.  Output should be retained such that it may be searched for data/index conflicts.  Search for `XDMP-RANGEINDEX` and check the `OUTPUT_RECORDS_FAILED` count.

# Fields and Field Range Indexes

During development, the team drifted towards exclusive use of fields and field range indexes as they allowed us to use one or more XPath expressions per field to identify the correct portions within the JSON-LD content model.  As that model heavily reuses the same JSON property names in multiple contexts, other types of indexes were either not appropriate or ideal.  That said, keep the other index types in mind as new needs arise.  Note too that search tags and search patterns already offer partial to full support of the other index types.

## Database-Level Field Index Defaults

A copy of the database field-related indexing defaults are below.  In case this documentation is out of date, consider checking the source: the `database_config_json` variable within [/scripts/generateIndexConf/generate.py](/scripts/generateIndexConf/generate.py).

```
  "stemmed-searches": "off",
  "word-searches": false,
  "field-value-searches": false,
  "field-value-positions": false,
  "fast-phrase-searches": false,
  "fast-case-sensitive-searches": false,
  "fast-diacritic-sensitive-searches": false,
  "trailing-wildcard-searches": false,
  "trailing-wildcard-word-positions": false,
  "three-character-searches": false,
  "three-character-word-positions": false,
  "two-character-searches": false,
  "one-character-searches": false,
```

## Field Index Patterns

Thus far, three field index patterns emerged in support of search tags and the fields full text search criteria is resolved against.

The portion of the database indexing configuration utilizing the index patterns is generated into [/config/contentDatabaseConfGenerated.json](/config/contentDatabaseConfGenerated.json).  For more information, please see [/config/README.md's Database Index Configuration section](/config/README.md#database-index-configuration).

Each index pattern includes a copy of its indexing properties.  Should this documentation be out of date, please see [/config/contentDatabaseConfGenerated.json](/config/contentDatabaseConfGenerated.json).

### Keyword

The keyword index pattern is used by semantic search tags, non-semantic search tags, and fields full text search criteria is resolved against.  It supports partial matches where the user-supplied term could be a word or phrase, with or without wildcards.  An example keyword search tag is `agentName`.

This index pattern's settings are nearly opposite of the database defaults.

These search tags should set their `optionsReference` to `keyword`.  The associated search options are served up by the [search library's](/src/main/ml-modules/base/root/lib/searchLib.mjs) `getSearchOptions` via `getSearchOptionsByReference`.  The options include basic stemming and --conditionally-- synonyms.

```
  "stemmed-searches": "basic",
  "word-searches": true,
  "field-value-searches": true,
  "field-value-positions": true,
  "fast-phrase-searches": true,
  "fast-case-sensitive-searches": true,
  "fast-diacritic-sensitive-searches": true,
  "trailing-wildcard-searches": true,
  "trailing-wildcard-word-positions": true,
  "three-character-searches": true,
  "three-character-word-positions": true,
  "two-character-searches": false,
  "one-character-searches": false
```

### Exact Match

The exact match index pattern should be used for search tags configured to the `indexedValue` *search* pattern, are typically also configured as facets, are likely non-semantic, and are always to have the `optionsReference` column set to `exact`.  An example exact match search tag is `agentGenderId`.

The `indexedValue` search pattern varies only varies by one property value, from the database defaults: the index pattern must set `field-value-searches` to `true`.

```
  "stemmed-searches": "off",
  "word-searches": false,
  "field-value-searches": true,
  "field-value-positions": false,
  "fast-phrase-searches": false,
  "fast-case-sensitive-searches": false,
  "fast-diacritic-sensitive-searches": false,
  "trailing-wildcard-searches": false,
  "trailing-wildcard-word-positions": false,
  "three-character-searches": false,
  "three-character-word-positions": false,
  "two-character-searches": false,
  "one-character-searches": false,
```

### Exclusive Support of Field Range Indexes

The last index pattern are for fields that only exist when we need their values in field range indexes, which can be the case for inequality comparisons (e.g., dates and dimensions) and sorting search results.

This index pattern's settings match the database defaults.

```
  "stemmed-searches": "off",
  "word-searches": false,
  "field-value-searches": false,
  "field-value-positions": false,
  "fast-phrase-searches": false,
  "fast-case-sensitive-searches": false,
  "fast-diacritic-sensitive-searches": false,
  "trailing-wildcard-searches": false,
  "trailing-wildcard-word-positions": false,
  "three-character-searches": false,
  "three-character-word-positions": false,
  "two-character-searches": false,
  "one-character-searches": false,
```

## Fields with Range Indexes

The following was derived from the [configuration spreadsheet](https://docs.google.com/spreadsheets/d/1lwn2tzRNRHtLTPMNWvOsy5fYiIfY4wkthhvgctQ8Hpg/edit#gid=997981330) and the [script that generates the field and field range index configuration](/scripts/generateIndexConf/generate.py).

* Fields with a query type of "keyword" and a "Force Range Index?" column value of "Y".  *These are the subset of fields configured to the [Keyword](#keyword) index pattern that are used and required by auto complete.*
* Fields with names ending in "Identifier" or "Id".  *These are configured to the [Exact Match](#exact-match) index pattern.*
* Fields with a query type of "string" whose name includes "Sort".  *These are configured to the [Exclusive Support of Field Range Indexes](#exclusive-support-of-field-range-indexes) index pattern.*
* Fields with a query type of "dates" or "numbers".  *These are configured to the [Exclusive Support of Field Range Indexes](#exclusive-support-of-field-range-indexes) index pattern.*
