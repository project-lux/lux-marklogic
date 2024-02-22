## **LUX Backend: Importing Data**

- [Primary: Import Data Using MLCP via ML Gradle](#primary-import-data-using-mlcp-via-ml-gradle)
  - [Execution Context](#execution-context)
  - [Import Data: Full](#import-data-full)
  - [Import Data: Incremental](#import-data-incremental)
  - [Steps After Importing Data](#steps-after-importing-data)
    - [*Regenerate Data Constants*](#regenerate-data-constants)
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
* [Gradle Properties](/docs/lux-backend-deployment.md#gradle-properties).

Additional information on the properties used by both of the import data tasks, which should be defined in the `gradle-[env].properties` file.

| Property Name              | Description  |
|----------------------------|--------------|
| importDataHost             | The receiving environment's ML host name or IP address. May be that of a load balancer. |
| importDataPort             | The receiving environment's ML port to connect |
| importDataUsername         | The username to connect with. Does not influence the imported documents' permissions. |
| importDataPassword         | The password to connect with. |
| importDataFilePath         | The relative or absolute path of the input file.  If needed, a command line parameter could take precedence to this one. |
| importDataFileIsCompressed | Using a Boolean, indicate whether the input file is compressed (`true`) or not (`false`).  If needed, a command line parameter could take precedence to this one. |
| luxContentDatabase | The name of the database to evaluate the data constants queries against. |

The working directory should be the clone's root directory, which is also the directory `gradle-[env].properties` should be in.

## Import Data: Full

*Note: Please see [Detecting Conflicts Between Data and Index Configuration](/docs/lux-backend-database-indexing.md#detecting-conflicts-between-data-and-index-configuration) if interested in doing so.*

*Note 2: The following command may fail with a generic error reading "finished with non-zero exit value 1".  When the OS is Windows, the length of the generated command likely exceeded the maximum allowed length.  Switch to [Alternative 1: Import Data Using MLCP via Command Line](#alternative-1-import-data-using-mlcp-via-command-line) but be sure to come back to [Steps After Importing Data](#steps-after-importing-data).*

*Note 3: This task may also error out for Macs, with the same "finished with non-zero exit value 1" generic error.  While setting up a developer environment on a Mac with the m1 chip hosting a Docker container, we found it necessary to switch to [Alternative 1: Import Data Using MLCP via Command Line](#alternative-1-import-data-using-mlcp-via-command-line) and downgrade from Java 11 to Java 1.8.*

Full import syntax:

`./gradlew -i importDataFull -PenvironmentName=[env] -Pdatabase=[databaseName] -Pconfirm=true`

Full import example:

`./gradlew -i importDataFull -PenvironmentName=dev -Pdatabase=Documents -Pconfirm=true`

**After the above completes successfully, please follow the [Steps After Importing Data](#steps-after-importing-data).**

## Import Data: Incremental

*Note: Please see [Detecting Conflicts Between Data and Index Configuration](/docs/lux-backend-database-indexing.md#detecting-conflicts-between-data-and-index-configuration) if interested in doing so.*

*Note 2: The following command may fail with a generic error reading "finished with non-zero exit value 1".  When the OS is Windows, the length of the generated command likely exceeded the maximum allowed length.  Switch to [Alternative 1: Import Data Using MLCP via Command Line](#alternative-1-import-data-using-mlcp-via-command-line) but be sure to come back to [Steps After Importing Data](#steps-after-importing-data).*

*Note 3: This task may also error out for Macs, with the same "finished with non-zero exit value 1" generic error.  While setting up a developer environment on a Mac with the m1 chip hosting a Docker container, we found it necessary to switch to [Alternative 1: Import Data Using MLCP via Command Line](#alternative-1-import-data-using-mlcp-via-command-line) and downgrade from Java 11 to Java 1.8.*

Incremental import syntax:

`./gradlew -i importDataIncremental -PenvironmentName=[env] -Pdatabase=[databaseName]`

Incremental import example:

`./gradlew -i importDataIncremental -PenvironmentName=dev -Pdatabase=Documents`

The `confirm` parameter is not necessary for incremental loads as the target database is not cleared first.

**After the above completes successfully, please follow the [Steps After Importing Data](#steps-after-importing-data).**

## Steps After Importing Data

### *Regenerate Data Constants*

Data constants need to be regenerated after the associated content database is updated (or the generator, [dataConstantsGenerator.mjs](/src/main/ml-modules/base/root/runDuringDeployment/dataConstants/dataConstantsGenerator.mjs)).

At this time, it needs to be executed separately due to a conflict with the `database` parameter.

The `generateDataConstants` is configured by the `luxContentDatabase` property.  It specifies the database execution context.  Please review this property's value before running this task.

Unlike `processSearchTagConfig`, when this task completes successfully, the generated constants have already reached the modules database.

Regenerate data constants syntax:

`./gradlew -i generateDataConstants -PenvironmentName=[env]`

Regenerate data constants example:

`./gradlew -i generateDataConstants -PenvironmentName=dev`

The output should include a table where each row identifies the query executed, the number of constants it created, and how long the query took to execute:

```bash
> Task :generateDataConstants

Generating the data constants...

Duration | Constants | Query URIs
-------- | --------- | ----------
      54 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/animalSpecimens.json
      34 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/widthConcept.json
      35 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/collectionItem.json
      34 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/copyrightLicensingStatement.json
      36 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/curatorship.json
      35 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/department.json
      35 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/depthConcept.json
      35 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/female.json
   49097 |        66 | /runDuringDeployment/dataConstants/queries/IRIs/fieldCounts.json
      54 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/first.json
      46 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/fossil.json
      36 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/biologicalSpecimens.json
      36 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/heightConcept.json
      35 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/intersexual.json
      48 |      1425 | /runDuringDeployment/dataConstants/queries/IRIs/languages.json
      48 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/male.json
      36 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/nationality.json
      35 |         0 | /runDuringDeployment/dataConstants/queries/IRIs/occupation.json
      35 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/plantSpecimens.json
      35 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/primaryName.json
      47 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/typeOfWork.json
      36 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/visitors.json
      36 |         1 | /runDuringDeployment/dataConstants/queries/IRIs/gender.json
-------- | --------- | ----------
   49958 |      1511 | 23 queries

Data constants generator done.
```

For more information on this task, refer to [LUX Gradle Tasks](/docs/lux-backend-build-tool-and-tasks.md#lux-gradle-tasks).

### *Regenerate Remaining Search Terms*

Facet, hop inverse, type, ID, and IRI search terms are to be regenerated after changing [/src/main/ml-modules/base/root/config/facetsConfig.mjs](/src/main/ml-modules/base/root/config/facetsConfig.mjs), `hopInverseName` property values in [/src/main/ml-modules/base/root/config/searchTermConfig.mjs](/src/main/ml-modules/base/root/config/searchTermConfig.mjs), or the associated generator ([/src/main/ml-modules/base/root/runDuringDeployment/generateRemainingSearchTerms.mjs](/src/main/ml-modules/base/root/runDuringDeployment/generateRemainingSearchTerms.mjs)).

The associated Gradle task, `generateRemainingSearchTerms`, is run automatically when `mlDeploy`, `performBaseDeployment`, `copyDatabase`, or `mlLoadModules` (and thus `mlReloadModules`) runs.

As with generating data constants:

* Generating the remaining search terms needs to be executed separate from other tasks that use a different value for the `database` parameter.
* When this task completes successfully, the generated remaining search terms have already reached the modules database.  In fact, this Gradle task is modifying the deployed version of [/src/main/ml-modules/base/root/config/searchTermConfig.mjs](/src/main/ml-modules/base/root/config/searchTermConfig.mjs)

Regenerate remaining search terms syntax:

`./gradlew -i generateRemainingSearchTerms -PenvironmentName=[env]`

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

The advanced search configuration is to be regenerated after the remaining search terms are generated or when the associated generator ([/src/main/ml-modules/base/root/runDuringDeployment/generateRelatedListsConfig.mjs](/src/main/ml-modules/base/root/runDuringDeployment/generateRelatedListsConfig.mjs)) is modified. 

The associated Gradle task, `generateRelatedListsConfig`, is run automatically after `generateRemainingSearchTerms`.

As with generating data constants:

* Generating the related lists configuration needs to be executed separate from other tasks that use a different value for the `database` parameter.
* When this task completes successfully, the generated related lists configuration have already reached the modules database.

Regenerate related lists configuration syntax:

`./gradlew -i generateRelatedListsConfig -PenvironmentName=[env]`

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

The advanced search configuration is to be regenerated after the remaining search terms are generated or when the associated generator ([/src/main/ml-modules/base/root/runDuringDeployment/generateAdvancedSearchConfig.mjs](/src/main/ml-modules/base/root/runDuringDeployment/generateAdvancedSearchConfig.mjs)) is modified.  

The associated Gradle task, `generateAdvancedSearchConfig`, is automatically after `generateRemainingSearchTerms`.

As with generating data constants:

* Generating the advanced search configuration needs to be executed separate from other tasks that use a different value for the `database` parameter.
* When this task completes successfully, the generated advanced search configuration have already reached the modules database.

Regenerate advanced search configuration syntax:

`./gradlew -i generateAdvancedSearchConfig -PenvironmentName=[env]`

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

`./gradlew mlLoadData -PenvironmentName=[env]`

## Clear Database

Should one find the need to clear the database as a separate command, one may do so using the following.  Note that `importDataFull` will clear the target database before importing the data.

Clear database syntax:

`./gradlew -i mlClearDatabase -PenvironmentName=[env] -Pdatabase=[databaseName] -Pconfirm=true`

Clear database example:

`./gradlew -i mlClearDatabase -PenvironmentName=dev -Pdatabase=Documents -Pconfirm=true`

# Alternative 1: Import Data Using MLCP via Command Line

MLCP may also be invoked directly, from the command line.

1. Optionally clear the database.  Consider this required if planning to enable MLCP's `fastload` option.\*
2. Download and extract the MLCP binaries version matching the ML version from https://developer.marklogic.com/products/mlcp/.
3. See [Detecting Conflicts Between Data and Index Configuration](/docs/lux-backend-database-indexing.md#detecting-conflicts-between-data-and-index-configuration) if interested in doing so.
4. Configure and run the following command from Git Bash (or switch to MLCP's batch file)

*For the `output_permissions`, use the current/resolved value of the `mlDataPermissions` Gradle property, which may or may not match the below value.*

```bash
[nohup] sh mlcp.sh import \
  -host [yourHost] \
  -port 8000 \
  -ssl true \
  -username [yourUsername] \
  -password [yourPassword] \
  -database lux-content \
  -fastload \
  -input_file_path /path/to/dataset.jsonl.gz \
  -input_file_type delimited_json \
  -input_compressed true \
  -input_compression_codec gzip \
  -output_permissions lux-endpoint-consumer,read,lux-writer,update \
  -output_uri_replace "https://lux.collections.yale.edu/data/,''" \
  -uri_id id
```

**If you are getting memory heap errors, try changing the allocated memory space. Try using ```set JVM_OPTS=-Xmx1G``` in CMD(if you are using windows OS)**

**After the above completes successfully, please follow the [Steps After Importing Data](#steps-after-importing-data).**

\* Fast load allows MLCP to go directly to the data nodes / forests, without care of a document with the same URI being in a different forest, and thus should only be used when the incoming document's URIs are new to the receiving database.  For more insights, see [Time vs. Correctness: Understanding -fastload Tradeoffs](https://docs.marklogic.com/guide/mlcp/import#id_29510).

Example 1: run MLCP from pipeline server to load dataset stored on local disk with an IP

```bash
# The username varies by pipeline server.
ssh -i [pemFilename] [username]@[ipAddress]
# Extract MLCP's application files, if not already available.
unzip mlcp-11.0.3-bin.zip to mlcp-11.0/;
cd bin;
nohup import_to_[env].sh &;
```

output is saved into nohup.out;
the sh script looks like:

```bash
~/mlcp-11.0/bin/mlcp.sh import \
  -host [yourHost] \
  -port 8000 \
  -ssl true \
  -username [yourUsername] \
  -password [yourPassword] \
  -database lux-content \
  -input_file_path /path/to/dataset \
  -input_file_type delimited_json \
  -uri_id id \
  -copy_permissions false \
  -input_compressed true \
  -input_compression_codec gzip \
  -copy_collections true \
  -copy_metadata true \
  -copy_properties true \
  -copy_quality true \
  -output_permissions lux-endpoint-consumer,read,lux-writer,update \
  -fastload true \
  -archive_metadata_optional true \
  -thread_count 128 \
  -batch_size 50
```
...where the directory specified by `-input_file_path` contains a number of .gz files. 

Example 2: run MLCP from pipeline server to load dataset stored on local disk with an ALB

```bash
# The username varies by pipeline server.
ssh -i [pemFilename] [username]@[ipAddress]
nohup import_to_[env].sh &;
```

Output is saved into nohup.out;
The sh script looks like:

```bash
~/mlcp-11.0/bin/mlcp.sh import \
  -host [yourHost] \
  -port 8000 \
  -ssl true \
  -username [yourUsername] \
  -password [yourPassword] \
  -database lux-content \
  -input_file_path /path/to/dataset \
  -input_file_type delimited_json \
  -uri_id id \
  -copy_permissions false \
  -input_compressed true \
  -input_compression_codec gzip \
  -copy_collections true \
  -copy_metadata true \
  -copy_properties true \
  -copy_quality true \
  -output_permissions lux-endpoint-consumer,read,lux-writer,update \
  -fastload true \
  -archive_metadata_optional true \
  -thread_count 128 \
  -batch_size 50
```
...where the directory specified by `-input_file_path` is the input file location. 

To move data from the first server to the second, run this rsync command from the first server,

rsync -avhn /path/to/dataset [username]@[targetHost]:[targetPath]

where -n means a dry run, remove it to really move data, or run this rsync command from the second server,

rsync -avhn [username]@[sourceHost]:[sourcePath] [targetPath]]

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

`./gradlew -i copyDatabase -PenvironmentName=[env]`

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
  -input_database lux-content \
  -output_host [outputHost] \
  -output_port 8000 \
  -output_ssl true \
  -output_username [outputUsername] \
  -output_password [outputPassword] \
  -output_database lux-content \
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
