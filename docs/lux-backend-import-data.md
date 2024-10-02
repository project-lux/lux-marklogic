## **LUX Backend: Importing Data**

- [Primary: Import Data Using MLCP via ML Gradle](#primary-import-data-using-mlcp-via-ml-gradle)
  - [Execution Context](#execution-context)
  - [Import Data: Full](#import-data-full)
  - [Import Data: Incremental](#import-data-incremental)
  - [Steps After Importing Data](#steps-after-importing-data)
    - [*Regenerate Remaining Search Terms*](#regenerate-remaining-search-terms)
    - [*Regenerate Related Lists Configuration*](#regenerate-related-lists-configuration)
    - [*Regenerate Advanced Search Configuration*](#regenerate-advanced-search-configuration)
    - [*Load the Thesauri*](#load-the-thesauri)
  - [Clear Database](#clear-database)
- [Alternative 1: Import Data Using MLCP via Command Line](#alternative-1-import-data-using-mlcp-via-command-line)
- [Alternative 2: Copy a Database](#alternative-2-copy-a-database)
- [More Information on MLCP](#more-information-on-mlcp)

# Primary: Import Data Using MLCP via ML Gradle

The project has a few ML Gradle tasks are related to importing data into MarkLogic.  These may be manually invoked or called by an automated process.  Likewise, these may be used in a developer's local environment and any shared environment, including blue and green.

## Execution Context

The external process' execution context needs a configured clone of the backend's repo.  See the following sections of [/docs/lux-backend-deployment.md](/docs/lux-backend-deployment.md):

* [Dependencies and Prerequisites](/docs/lux-backend-deployment.md#dependencies-and-prerequisites)
* [Tenant Configuration](/docs/lux-backend-deployment.md#tenant-configuration)

Additional information on the properties used by both of the import data tasks, which should be defined in the `gradle-[name].properties` file.

| Property Name              | Description  |
|----------------------------|--------------|
| importDataHost             | The receiving environment's ML host name or IP address. May be that of a load balancer. |
| importDataPort             | The receiving environment's ML port to connect |
| importDataUsername         | The username to connect with. Does not influence the imported documents' permissions. |
| importDataPassword         | The password to connect with. |
| importDataFilePath         | The relative or absolute path of the input file.  If needed, a command line parameter could take precedence to this one. |
| importDataFileIsCompressed | Using a Boolean, indicate whether the input file is compressed (`true`) or not (`false`).  If needed, a command line parameter could take precedence to this one. |
| tenantContentDatabase | The name of the database to evaluate queries against. |

The working directory should be the clone's root directory, which is also the directory `gradle-[name].properties` should be in.

## Import Data: Full

*Note: Please see [Detecting Conflicts Between Data and Index Configuration](/docs/lux-backend-database-indexing.md#detecting-conflicts-between-data-and-index-configuration) if interested in doing so.*

*Note 2: The following command may fail with a generic error reading "finished with non-zero exit value 1".  When the OS is Windows, the length of the generated command likely exceeded the maximum allowed length.  Switch to [Alternative 1: Import Data Using MLCP via Command Line](#alternative-1-import-data-using-mlcp-via-command-line) but be sure to come back to [Steps After Importing Data](#steps-after-importing-data).*

*Note 3: This task may also error out for Macs, with the same "finished with non-zero exit value 1" generic error.  While setting up a developer environment on a Mac with the m1 chip hosting a Docker container, we found it necessary to switch to [Alternative 1: Import Data Using MLCP via Command Line](#alternative-1-import-data-using-mlcp-via-command-line) and downgrade from Java 11 to Java 1.8.*

Full import syntax:

`./gradlew -i importDataFull -PenvironmentName=[name] -Pdatabase=[databaseName] -Pconfirm=true`

Full import example:

`./gradlew -i importDataFull -PenvironmentName=dev -Pdatabase=Documents -Pconfirm=true`

**After the above completes successfully, please follow the [Steps After Importing Data](#steps-after-importing-data).**

## Import Data: Incremental

*Note: Please see [Detecting Conflicts Between Data and Index Configuration](/docs/lux-backend-database-indexing.md#detecting-conflicts-between-data-and-index-configuration) if interested in doing so.*

*Note 2: The following command may fail with a generic error reading "finished with non-zero exit value 1".  When the OS is Windows, the length of the generated command likely exceeded the maximum allowed length.  Switch to [Alternative 1: Import Data Using MLCP via Command Line](#alternative-1-import-data-using-mlcp-via-command-line) but be sure to come back to [Steps After Importing Data](#steps-after-importing-data).*

*Note 3: This task may also error out for Macs, with the same "finished with non-zero exit value 1" generic error.  While setting up a developer environment on a Mac with the m1 chip hosting a Docker container, we found it necessary to switch to [Alternative 1: Import Data Using MLCP via Command Line](#alternative-1-import-data-using-mlcp-via-command-line) and downgrade from Java 11 to Java 1.8.*

Incremental import syntax:

`./gradlew -i importDataIncremental -PenvironmentName=[name] -Pdatabase=[databaseName]`

Incremental import example:

`./gradlew -i importDataIncremental -PenvironmentName=dev -Pdatabase=Documents`

The `confirm` parameter is not necessary for incremental loads as the target database is not cleared first.

**After the above completes successfully, please follow the [Steps After Importing Data](#steps-after-importing-data).**

## Steps After Importing Data

### *Regenerate Remaining Search Terms*

Facet, hop inverse, type, ID, and IRI search terms are to be regenerated after changing [/src/main/ml-modules/root/config/facetsConfig.mjs](/src/main/ml-modules/root/config/facetsConfig.mjs), `hopInverseName` property values in [/src/main/ml-modules/root/config/searchTermsConfig.mjs](/src/main/ml-modules/root/config/searchTermsConfig.mjs), the `endpointAccessUnitNames` build property value, or the associated generator ([/src/main/ml-modules/root/runDuringDeployment/generateRemainingSearchTerms.mjs](/src/main/ml-modules/root/runDuringDeployment/generateRemainingSearchTerms.mjs)).

The associated Gradle task, `generateRemainingSearchTerms`, is run automatically when `mlDeploy`, `performBaseDeployment`, `copyDatabase`, or `mlLoadModules` (and thus `mlReloadModules`) runs.

* Generating the remaining search terms needs to be executed separate from other tasks that use a different value for the `database` parameter.
* When this task completes successfully, the generated remaining search terms have already reached the modules database.  In fact, this Gradle task is modifying the deployed version of [/src/main/ml-modules/root/config/searchTermsConfig.mjs](/src/main/ml-modules/root/config/searchTermsConfig.mjs)

Regenerate remaining search terms syntax:

`./gradlew -i generateRemainingSearchTerms -PenvironmentName=[name]`

Regenerate remaining search terms example:

`./gradlew -i generateRemainingSearchTerms -PenvironmentName=dev`

Expected output:

```bash
> Task :generateRemainingSearchTerms
Generating the remaining search terms...
Remaining search term generation complete.
```

For more information on this task, refer to [LUX Gradle Tasks](/docs/lux-backend-build-tool-and-tasks.md#lux-gradle-tasks).

### *Regenerate Related Lists Configuration*

The related lists configuration is to be regenerated after the remaining search terms are generated or when either the value of the `endpointAccessUnitNames` build property or the associated generator [/src/main/ml-modules/root/runDuringDeployment/generateRelatedListsConfig.mjs](/src/main/ml-modules/root/runDuringDeployment/generateRelatedListsConfig.mjs) changes.

The associated Gradle task, `generateRelatedListsConfig`, is run automatically after `generateRemainingSearchTerms`.

* Generating the related lists configuration needs to be executed separate from other tasks that use a different value for the `database` parameter.
* When this task completes successfully, the generated related lists configuration have already reached the modules database.

Regenerate related lists configuration syntax:

`./gradlew -i generateRelatedListsConfig -PenvironmentName=[name]`

Regenerate related lists configuration example:

`./gradlew -i generateRelatedListsConfig -PenvironmentName=dev`

Expected output:

```bash
> Task :generateRelatedListsConfig
Generating the related lists configuration...
Related lists configuration generation complete.
```

For more information on this task, refer to [LUX Gradle Tasks](/docs/lux-backend-build-tool-and-tasks.md#lux-gradle-tasks).

### *Regenerate Advanced Search Configuration*

The advanced search configuration is to be regenerated after the remaining search terms are generated or when either the value of the `endpointAccessUnitNames` build property or the associated generator ([/src/main/ml-modules/root/runDuringDeployment/generateAdvancedSearchConfig.mjs](/src/main/ml-modules/root/runDuringDeployment/generateAdvancedSearchConfig.mjs)) changes.

The associated Gradle task, `generateAdvancedSearchConfig`, is automatically after `generateRemainingSearchTerms`.

* Generating the advanced search configuration needs to be executed separate from other tasks that use a different value for the `database` parameter.
* When this task completes successfully, the generated advanced search configuration have already reached the modules database.

Regenerate advanced search configuration syntax:

`./gradlew -i generateAdvancedSearchConfig -PenvironmentName=[name]`

Regenerate advanced search configuration example:

`./gradlew -i generateAdvancedSearchConfig -PenvironmentName=dev`

Expected output:

```bash
> Task :generateAdvancedSearchConfig
Generating the advanced search configuration...
Advanced search configuration generation complete.
```

For more information on this task, refer to [LUX Gradle Tasks](/docs/lux-backend-build-tool-and-tasks.md#lux-gradle-tasks).

### *Load the Thesauri*

Load the thesauri and anything else within [/src/main/ml-data](/src/main/ml-data) into the content database:

`./gradlew mlLoadData -PenvironmentName=[name]`

## Clear Database

Should one find the need to clear the database as a separate command, one may do so using the following.  Note that `importDataFull` will clear the target database before importing the data.

Clear database syntax:

`./gradlew -i mlClearDatabase -PenvironmentName=[name] -Pdatabase=[databaseName] -Pconfirm=true`

Clear database example:

`./gradlew -i mlClearDatabase -PenvironmentName=dev -Pdatabase=Documents -Pconfirm=true`

# Alternative 1: Import Data Using MLCP via Command Line

MLCP may also be invoked directly, from the command line.

1. Optionally clear the database.  Consider this required if planning to enable MLCP's `fastload` option.\*
2. Download and extract the MLCP binaries version matching the ML version from https://developer.marklogic.com/products/mlcp/.
3. See [Detecting Conflicts Between Data and Index Configuration](/docs/lux-backend-database-indexing.md#detecting-conflicts-between-data-and-index-configuration) if interested in doing so.
4. Configure and run the following command.

*The transform function is responsible for setting document permissions.*

```bash
[nohup] sh mlcp.sh import \
  -host [yourHost] \
  -port 8000 \
  -ssl true \
  -username [yourUsername] \
  -password [yourPassword] \
  -database [%%mlAppName%%-content] \
  -modules [%%mlAppName%%-modules] \
  -fastload \
  -input_file_path /path/to/dataset.jsonl.gz \
  -input_file_type delimited_json \
  -input_compressed true \
  -input_compression_codec gzip \
  -transform_module /documentTransforms.sjs \
  -transform_function associateDocToDataSlice \
  -uri_id id
```

**If you are getting memory heap errors, try changing the allocated memory space. Try using ```set JVM_OPTS=-Xmx1G``` in CMD(if you are using windows OS)**

**After the above completes successfully, please follow the [Steps After Importing Data](#steps-after-importing-data).**

\* Fast load allows MLCP to go directly to the data nodes / forests, without care of a document with the same URI being in a different forest, and thus should only be used when the incoming document's URIs are new to the receiving database.  For more insights, see [Time vs. Correctness: Understanding -fastload Tradeoffs](https://docs.marklogic.com/guide/mlcp/import#id_29510).

# Alternative 2: Copy a Database

*Note: MLCP COPY has failed to copy all records at times. An MLCP EXPORT followed by an MLCP IMPORT has always copied all records. We did not investigate the issue with MLCP COPY but if copying all records is important go with EXPORT and IMPORT.*

The `copyDatabase` Gradle task was introduced as a developer convenience: copy data from a shared environment to a local environment.  It may be configured by the following properties.

| Property Name              | Description  |
|----------------------------|--------------|
| copyDatabaseInputHost      | The host containing the source database. |
| copyDatabaseInputPort      | `copyDatabaseInputHost`'s port to connect to.  8000 is a safe bet. |
| copyDatabaseInputUsername  | Username to connect to `copyDatabaseInputHost` with. |
| copyDatabaseInputPassword  | `copyDatabaseInputUsername`'s password. |
| copyDatabaseInputDatabase  | The name of the database to be copied. |
| copyDatabaseOutputHost     | The host containing the target database. |
| copyDatabaseOutputPort     | `copyDatabaseOutputHost`'s port to connect to.  8000 is a safe bet.  |
| copyDatabaseOutputUsername | Username to connect to `copyDatabaseOutputHost` with. |
| copyDatabaseOutputPassword | `copyDatabaseOutputUsername`'s password. |
| copyDatabaseOutputDatabase | The name of the database to copy into. |
| copyDatabaseBatchSize      | Number of documents to copy per batch. |
| copyDatabaseThreadCount    | Number of concurrent threads. |

Copy database syntax:

`./gradlew -i copyDatabase -PenvironmentName=[name]`

Copy database example:

`./gradlew -i copyDatabase -PenvironmentName=local`

The `environmentName` value should align with the properties file that defines the `copyDatabase*` properties you wish used.

**After the above completes successfully, please follow the [Steps After Importing Data](#steps-after-importing-data).**

To run MLCP directly, use the following as a template:

```bash
[nohup] sh mlcp.sh copy \
  -input_host [inputHost] \
  -input_port 8000 \
  -input_ssl true \
  -input_username [inputUsername] \
  -input_password [inputPassword] \
  -input_database [inputContentDatabaseName] \
  -output_host [outputHost] \
  -output_port 8000 \
  -output_ssl true \
  -output_username [outputUsername] \
  -output_password [outputPassword] \
  -output_database [outputContentDatabaseName] \
  -copy_permissions true \
  -copy_collections true \
  -copy_metadata true \
  -copy_properties true \
  -copy_quality true \
  -fastload true \
  -batch_size 100 \
  -thread_count 12
```

Same as with importing the data, see [Detecting Conflicts Between Data and Index Configuration](/docs/lux-backend-database-indexing.md#detecting-conflicts-between-data-and-index-configuration) if interested in doing so.

# More Information on MLCP

For more information on MLCP, see the [MLCP User Guide](https://docs.marklogic.com/guide/mlcp), specifically the [Importing Content Into MarkLogic Server](https://docs.marklogic.com/guide/mlcp/import) chapter and [Import Command Line Options](https://docs.marklogic.com/guide/mlcp/import#id_23879) section thereof.

Other sections in the [MLCP User Guide](https://docs.marklogic.com/guide/mlcp) discuss:

1. Copying data between two databases, whether the databases are in the environment or not.  *See [Alternative 2: Copy a Database](#alternative-2-copy-a-database).*
2. Exporting data from a database.
