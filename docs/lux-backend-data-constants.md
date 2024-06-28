## **LUX Backend Data Constants**

- [Introduction](#introduction)
- [Generator](#generator)
- [Finding IRIs for New Data Constants](#finding-iris-for-new-data-constants)
- [Runtime Usage](#runtime-usage)
- [Example: Query with One Result](#example-query-with-one-result)
- [Example: Query with Multiple Results](#example-query-with-multiple-results)

# Introduction

To improve runtime efficiency, a data constants generator is run ahead of time and is responsible for generating a file of constants whose values derived by SPARQL queries or JavaScript snippets.  Examples constants: primary name IRI and English language IRI.  Having these constants enable the runtime application to, for example, extract an object's English primary name from the object's JSON-LD file without having to execute one or more SPARQL queries to get the associated IRIs.

The backend's data constant generator also incorporates data constants provided by the data pipeline, giving precedence to the former.

# Generator

The `generateDataConstants` Gradle task invokes the generator, and is wired to automatically run after `mlLoadModules` and `copyDatabase`.  Due to a conflict with the `database` parameter, this task is **not** automatically run after `importDataFull` or `importDataIncremental` --it must be run after those though (See [/docs/lux-backend-import-data.md](/docs/lux-backend-import-data.md)).  There may be additional circumstances when `generateDataConstants` needs to be run.  Basically, any time the modules database is cleared or the data changes the `generateDataConstants` Gradle task needs to be run.  If you're deploying *generator* updates via `mlWatch`, you'll probably need to run the `generateDataConstants` Gradle task when ready to test the changes.

The database to execute the queries against may be specified by the `tenantContentDatabase` Gradle property.

The generator is implemented by [/src/main/ml-modules/root/runDuringDeployment/dataConstants/dataConstantsGenerator.mjs](/src/main/ml-modules/root/runDuringDeployment/dataConstants/dataConstantsGenerator.mjs).  When invoked, the generator iterates through all JSON-formatted data constant configuration files within [/src/main/ml-modules/root/runDuringDeployment/dataConstants/queries](/src/main/ml-modules/root/runDuringDeployment/dataConstants/queries), inclusive of sub-directories.  For each, the generator attempts to define one or more data constants.  How many constants and the names of constants are determined by the query's configuration and results.  For SPARQL queries, the generator adds the prefixes defined by [/src/main/ml-modules/root/lib/appConstants.mjs](/src/main/ml-modules/root/lib/appConstants.mjs)' `SPARQL_PREFIXES` constant; thus, the queries should not also.

Each configuration file is to be accompanied by a SPARQL (\*.sparql) or JavaScript (\*.mjs) file, defining the data constant's query.  The query file needs to have the same path/URI as its configuration file, less the file extension.

JavaScript query files need to be to be MJS main modules that return an array of values.  For an example, see [/src/main/ml-modules/root/runDuringDeployment/dataConstants/queries/IRIs/languages.mjs](/src/main/ml-modules/root/runDuringDeployment/dataConstants/queries/IRIs/languages.mjs).

The configuration data model has the following properties.

| Property | Example | Default | Description |
| -------- | ------- | ------- | ----------- |
| `type` | "mjs" | "sparql" | The type of query file. Supported values: "sparql" and "mjs". |
| `name` | "primaryName" | Basename | Name of constant when `keyName` is not defined. The default is the basename in the query's URI. `name` or `nameKey` is required; `nameKey` takes precedence. Use this to override the constant name for queries that return a single value. |
| `nameKey` | "name" | *None* | The SPARQL query result key to use as the constant's name. `name` or `nameKey` is required; `nameKey` takes precedence. Use this for queries that may return multiple results and a constant is to be defined for each. |
| `namePrefix` | "lang" | *None* | Constant name prefix. Optional. |
| `nameSuffix` | "Caboose" | *None* | Constant name suffix. Optional. |
| `valueKey` | "value" | *None* | The SPARQL query result key to use as the constant's value. **Required**. |
| `warnIfMultiple` | `true` | `false` | Set to `true` to have the generator log a warning when the query returns more than one result. Only the first result will be represented as a constant. |

After all of the configured queries are executed, the generator adds any unique data constants originating within [/scripts/generateIndexConf/pipelineDataConstants.json](/scripts/generateIndexConf/pipelineDataConstants.json).  That file should be updated after its constants could have changed.  This may be done by running [/scripts/generateIndexConf/getPipelineDataConstants.py](/scripts/generateIndexConf/getPipelineDataConstants.py) from an environment that has access to the Redis ID map.  Within this project, the `copyPipelineDataConstants` gradle task is responsible for making a copy of the constants available to the backend's data constant generator.

# Finding IRIs for New Data Constants

When you need to define a new data constant, you may need an IRI to determine the IRI(s) you want the constant of.  As of this writing, all data constants less those for languages follow the same query pattern:

```
SELECT DISTINCT ?objectIri WHERE {
  ?objectIri a crm:E55_Type ;
      la:equivalent <http://vocab.getty.edu/aat/300404670> .
}
```

But how did someone know to use `http://vocab.getty.edu/aat/300404670`?

They didn't go by `rdfs:label` as those labels are unreliable --meant to help one looking at JSON-LD but not to be relied upon.

One option is to consult your local friendly Linked Data expert.  Short of that, you may need to search the data itself.

# Runtime Usage

Generated constants are written within `/lib/dataConstants.mjs`, in the modules database.  A copy is not stored in source control.

The runtime application may interact with the data constants by importing and using one of the functions from `/lib/dataConstants.mjs`.

| Function | Description |
| -------- | ----------- |
| `hasIRI([name])` | Find out if an IRI data constant exists. Returns true or false. Does not throw an exception. |
| `getIRI([name])` | Get the value of an IRI data constant. Exception thrown if the data constant is not defined. |
| `hasLanguageIRI([languageCode])` | Same as `hasIRI([name])` but specific to language IRI data constants. Enables caller to send in the language code as opposed to the language IRI data constant's name. | 
| `getLanguageIRI([languageCode])` | Same as `getIRI([name])` but specific to language IRI data constants. Enables caller to send in the language code as opposed to the language IRI data constant's name. | 

See the next sections for examples.

# Example: Query with One Result

[/src/main/ml-modules/root/runDuringDeployment/dataConstants/queries/IRIs/primaryName.sparql](/src/main/ml-modules/root/runDuringDeployment/dataConstants/queries/IRIs/primaryName.sparql): 

```
SELECT ?objectIri WHERE {
  ?objectIri a crm:E55_Type .
  ?objectIri rdfs:label "Primary Name"
}
```

[/src/main/ml-modules/root/runDuringDeployment/dataConstants/queries/IRIs/primaryName.json](/src/main/ml-modules/root/runDuringDeployment/dataConstants/queries/IRIs/primaryName.json): 

```
{
  "valueKey": "objectIri",
  "warnIfMultiple": true
}
```

Runtime access after generator is run:

```
import { getIRI } from '/lib/dataConstants';

getIRI('primaryName')
```

Had the configuration file set the `name` property to `someOtherName`: `getIRI('someOtherName')`.

# Example: Query with Multiple Results

[/src/main/ml-modules/root/runDuringDeployment/dataConstants/queries/IRIs/languages.mjs](/src/main/ml-modules/root/runDuringDeployment/dataConstants/queries/IRIs/languages.mjs): 

```
SELECT DISTINCT ?label ?objectIri WHERE {
  ?objectIri a crm:E56_Language .
  ?objectIri rdfs:label ?label
  FILTER ( ?label != "und" )
}
```

[/src/main/ml-modules/root/runDuringDeployment/dataConstants/queries/IRIs/languages.json](/src/main/ml-modules/root/runDuringDeployment/dataConstants/queries/IRIs/languages.json): 

```
{
  "namePrefix": "lang",
  "nameKey": "label",
  "valueKey": "objectIri"
}
```

Runtime access after generator is run:

```
import { hasLanguageIRI, getLanguageIRI } from '/lib/dataConstants';

let languageIRI = null;
if (hasLanguageIRI(languageCode)) {
  languageIRI = getLanguageIRI(languageCode);
} else {
  languageIRI = getLanguageIRI(DEFAULT_LANGUAGE_CODE);
}
```
