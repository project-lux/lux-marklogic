## **Config Directory Documentation**

- [Conf Directory](#conf-directory)
  - [Database Index Configuration](#database-index-configuration)
# Conf Directory

## Database Index Configuration

This directory includes [/config/contentDatabaseConfGenerated.json](/config/contentDatabaseConfGenerated.json), which is the generated portion of the ML Gradle content database configuration, [/src/main/ml-config/base/databases/content-database.json](/src/main/ml-config/base/databases/content-database.json).  The `preprocessMarkLogicConfigurationFiles` ML Gradle task is responsible for  merging the two and writing the result within [/build/main/ml-config/base/databases/content-database.json](/build/main/ml-config/base/databases/content-database.json).  The `mlConfigPaths` ML Gradle build property configures ML Gradle to use the configuration files within /build/main/ml-config vs /src/main/ml-config.  Related: [Custom Token Replacement](/docs/lux-backend-deployment.md#custom-token-replacement).

Here is how we maintain [/config/contentDatabaseConfGenerated.json](/config/contentDatabaseConfGenerated.json):

1. The generated index configuration source is https://docs.google.com/spreadsheets/d/1lwn2tzRNRHtLTPMNWvOsy5fYiIfY4wkthhvgctQ8Hpg/edit#gid=538027221, yet is dependent on some data constants.  Despite being referred to as constants, it is possible that their values change when the dataset is updated.
2. Determine if data constant values changed in the dataset, and take the appropriate actions if they have.
    * Get a new pipelineDataConstants.json - this can be generated from a script called "getPipelineDataConstants.py" in the pipeline repository
    * Update [/scripts/generateIndexConf/pipelineDataConstants.json](/scripts/generateIndexConf/pipelineDataConstants.json) with the new file. If there are differences between the old and new file, proceed with the following steps.
    * Update the generated index configuration source should constants found in the XPath expressions have changed.
    * Keep the changes to [/scripts/generateIndexConf/pipelineDataConstants.json](/scripts/generateIndexConf/pipelineDataConstants.json) and run `mlLoadModules`.  Doing so will make a copy of this file available to the backend's data constant generator which will then include unique data constants in its output, and thus the [`/data-constants` endpoint](/docs/lux-backend-api-usage.md#data-constants).
3. After the above spreadsheet is updated, a TSV export should be created and saved as [/scripts/generateIndexConf/input.tsv](/scripts/generateIndexConf/input.tsv).
4. The [/scripts/generateIndexConf/generate.py](/scripts/generateIndexConf/generate.py) script reads [/scripts/generateIndexConf/input.tsv](/scripts/generateIndexConf/input.tsv) in to generate [/config/contentDatabaseConfGenerated.json](/config/contentDatabaseConfGenerated.json).
5. When the `mlUpdateIndexes` Gradle task or higher is run, [/config/contentDatabaseConfigGenerated.json](/config/contentDatabaseConfGenerated.json) is pulled into [/src/main/ml-config/base/databases/content-database.json](/src/main/ml-config/base/databases/content-database.json) and sent to MarkLogic Server.
6. One may then run [/scripts/generateIndexConf/indexComparisonChecks.js](/scripts/generateIndexConf/indexComparisonChecks.js) to determine the following.  This script accounts for index references within [/src/main/ml-modules/root/config](/src/main/ml-modules/root/config).
    * The code references fields or field range indexes that are not configured in the database, opening us up to **runtime errors**.
    * The database configures fields or field range indexes that are not referenced by the code, leading to larger memory and storage footprints than necessary.
