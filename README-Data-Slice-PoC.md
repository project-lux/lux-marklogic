# Data Slice Proof of Concept

## Deploy

To deploy the Data Slice PoC locally:

1. Add the data slice-specific ml-config and ml-modules directories to the `mlConfigPaths` and `mlModulePaths` properties:

        # ML modules and configuration directories
        mlConfigPaths=build/main/ml-config/base,build/main/ml-config/base-unsecured,build/main/ml-config/data-slices
        mlModulePaths=src/main/ml-modules/base,src/main/ml-modules/data-slices

2. Run `mlDeploy`
3. Run `mlLoadData`

## Search

Once the configuration and data are deployed, the search endpoint may be used to demonstrate a data slice service account searching for non-semantic and/or semantic criteria and being restricted the data slice's documents.

To do so in the likes of Postman, consume the `/ds/lux/search.mjs` endpoint where:

1. Credentials are provided for one of the data slice service accounts:
     * `data-lux`, which has access to all PoC documents.
     * `data-slice01`, which only has access to slice 01 PoC documents.
     * `data-slice02`, which only has access to slice 02 PoC documents.
2. Set the `scope` parameter to `data-slice`.
3. Set the `q` parameter to one or more of the PoC keywords.  Either search grammar may be used but the search scope only supports text/keywords searches.  The full list of keywords may be found in the second column of the below table.
4. Run the search.

Search result counts by keyword and user:

| Keyword Type | Keyword             | data-lux | data-slice01 | data-slice02 |
|--------------|---------------------|----------|--------------|--------------|
| Non-Semantic | nsKeyword           | 4        | 2            | 2            |
| Non-Semantic | nsLUX               | 1        | 0            | 0            |
| Non-Semantic | nsSlice01           | 1        | 1            | 0            |
| Non-Semantic | nsSlice02           | 1        | 0            | 1            |
| Non-Semantic | nsSlice01andSlice02 | 1        | 1            | 1            |
| Semantic     | sKeyword            | 9        | 3            | 3            |
| Semantic     | sLUX                | 1        | 0            | 0            |
| Semantic     | sSlice01            | 6        | 3            | 2            |
| Semantic     | sSlice02            | 7        | 2            | 3            |
| Semantic     | sSlice01andSlice02  | 4        | 2            | 2            |

It can be tricky to validate search results.  A script was developed to help: [/scripts/dataSlices/checkSemanticKeywordsToSubjectDocs.js](/scripts/dataSlices/checkSemanticKeywordsToSubjectDocs.js).  See comments therein for details.

## How It Works

1. Documents are given the read permission to each data slice role they are associated to.
    * Documents that the search endpoint are able to return were loaded using the `mlLoadData` Gradle task and utilized `permissions.properties` files to specify the document permissions.  This was for the PoC only.  See [Document to Data Slice Association](#document-to-data-slice-association) for details on the alternative.
    * The `data-lux` role is granted read permission to every document as it represents the full LUX site, versus a unit portal.
2. Characteristics of the PoC documents loaded via `mlLoadData`:
    * An `id` property value that matches its URI.
    * In four documents, one or more non-semantic keywords in the `nonSemanticKeywords` property, which populates a searchable field and field range index of the same name.
    * In eight documents, one or more semantic keywords in the `semanticKeywords` property, which populates a searchable field and field range index of the same name.
    * In ten documents, one or more triples in the `triples` property whereby the subject IRI matches the document's URI, the predicate is always `https://lux.collections.yale.edu/ns/isRelatedTo`, and the object IRI is the URI of the document that may define the `semanticKeywords` property.
    * A `dataType` property value of `data-slice`.  This becomes record type search criteria.  This search scope was only introduced to better isolate the PoC documents from other documents and will not persist beyond the PoC.
3. When a search is performed:
    * Non-semantic keywords must be directly in the search result documents.
    * Semantic keywords must be in documents related to the search result documents (one `isRelatedTo` hop).  Further, the requesting user must a role that at least has read permission to the *related* document.
    * The requesting user must have a role that at least has read permission to the *search result* document.
    * Of less import to the PoC, the document must have a `dataType` property value of `data-slice`.

## Document to Data Slice Association

Post-PoC the documents will need to identify which data slices (units) they are associated with.  Document permissions may be derived form this data regardless of a live feed from the pipeline (`/v1/documents`) or loading from disk (MLCP).

While the PoC documents accessible via search do not include data that identify data slices, the PoC did prove out the ability to set document permissions based on data within the documents while loading the documents.  This was performed using a transform.  MLCP consumes the `/v1/documents` endpoint and that endpoint supports a custom transform.  While a custom transform can transform the incoming content, they do not have to.  They are also capable of setting document permissions and collections, if not more.  The PoC used [/src/main/ml-modules/data-slices/root/documentTransforms.sjs](/src/main/ml-modules/data-slices/root/documentTransforms.sjs) to set document permissions and collections based on the `slices` property value found in the documents.  The [/scripts/dataSlices/mlcpTransformTest/mlcp.bat](/scripts/dataSlices/mlcpTransformTest/mlcp.bat) script demonstrates how to specify the transform when loading documents via MLCP.  Upon running it, the permissions of documents in the "mlcp" collection may be compared to the `slices` property values.

Both methods used to load PoC documents also put documents into collections; however, collections are not yet utilized or deemed necessary.

## Additional Scripts

Additional scripts were developed during the PoC.  See comments in the scripts for additional details.

* [/scripts/dataSlices/checkTripleAndDocVisibilityByUser.js](/scripts/dataSlices/checkTripleAndDocVisibilityByUser.js): Find out which users can see which triples and documents, restricted by a single predicate and maximum number of hops.
* [/scripts/dataSlices/checkTripleVisibilityByUser.js](/scripts/dataSlices/checkTripleVisibilityByUser.js): Find out which users can see which triples, restricted by one or more predicates and an optional maximum number of triples.  Pre-cursor to and supports a subset of what the above script does.
