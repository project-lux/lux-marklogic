There are two ML Gradle projects herein:

* [./embedded-triples](./embedded-triples) inclusive of:
    * LUX role and user with read access to all documents (and thus triples).
    * Slice roles and users for slice01 and slice02:
        * Exclusive documents and triples.
        * Exclusive document linking to documents shared by two slices.
        * Exclusive document linking to documents the slice does not have access to.
    * Documents shared by two slices linking to each slice.
* [./standalone-triples](standalone-triples):
    * LUX and slice roles have read permissions to all documents, slice-specific or otherwise.
    * One triple permissioned to LUX and connecting two LUX documents.
    * One triple permissioned to Slice01 and connecting two Slice01 documents.
    * One triple permissioned to Slice02 and connecting two Slice02 documents.

When their ML Gradle configuration and data are deployed, the `embedded-triples-content` and `standalone-triples-content` databases will become available and include a few docs each.

Two scripts are also provided:

* [./scripts/triple-and-doc-visibility-by-user.js](./scripts/triple-and-doc-visibility-by-user.js): By user, returns the triple paths that are visible to the user.  Separates triple paths into ones that the user is also able to view the last triple's object document from those the user cannot see.  Able to set the number of hops.  Able to include or exclude the raw data that informs the triple paths.
* [./scripts/triple-visibility-by-user.js](./scripts/triple-visibility-by-user.js): Developed before the above script, this one performs a subset of what the other one does: emit the full triples each user has access to.

Both scripts include directions for setting up the ML Gradle projects then using the scripts.

To remove these projects from your MarkLogic instance, `cd` to one of the project's directories and run `[path]/gradle mlUndeploy -i -Pconfirm=true` then repeat for the other.
