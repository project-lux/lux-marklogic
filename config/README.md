## **Config Directory Documentation**

- [Conf Directory](#conf-directory)
  - [Database Index Configuration](#database-index-configuration)
# Conf Directory

## Database Index Configuration

This directory includes [/config/contentDatabaseConfGenerated.json](/config/contentDatabaseConfGenerated.json), which is the generated portion of the ML Gradle content database configuration, [/src/main/ml-config/base/databases/content-database.json](/src/main/ml-config/base/databases/content-database.json).  The `preprocessRuntimeConfigAndModules` ML Gradle task is responsible for  merging the two and writing the result within [/build/main/ml-config/base/databases/content-database.json](/build/main/ml-config/base/databases/content-database.json).  The `mlConfigPaths` ML Gradle build property configures ML Gradle to use the configuration files within /build/main/ml-config vs /src/main/ml-config.  Related: [Custom Token Replacement](/docs/lux-backend-deployment.md#custom-token-replacement).

Here is how we maintain [/config/contentDatabaseConfGenerated.json](/config/contentDatabaseConfGenerated.json):

1. The generated index configuration source is https://docs.google.com/spreadsheets/d/1lwn2tzRNRHtLTPMNWvOsy5fYiIfY4wkthhvgctQ8Hpg/edit#gid=538027221
2. After the above spreadsheet is updated, a TSV export should be created and saved as [/scripts/generateIndexConf/input.tsv](/scripts/generateIndexConf/input.tsv).
3. The [/scripts/generateIndexConf/generate.py](/scripts/generateIndexConf/generate.py) script reads [/scripts/generateIndexConf/input.tsv](/scripts/generateIndexConf/input.tsv) in to generate [/config/contentDatabaseConfGenerated.json](/config/contentDatabaseConfGenerated.json).
4. When the `mlUpdateIndexes` Gradle task or higher is run, [/config/contentDatabaseConfigGenerated.json](/config/contentDatabaseConfGenerated.json) is pulled into [/src/main/ml-config/base/databases/content-database.json](/src/main/ml-config/base/databases/content-database.json) and sent to MarkLogic Server.
5. One may then run [/scripts/generateIndexConf/indexComparisonChecks.js](/scripts/generateIndexConf/indexComparisonChecks.js) to determine the following.  This script accounts for index references within [/src/main/ml-modules/root/config](/src/main/ml-modules/root/config).
    * The code references fields or field range indexes that are not configured in the database, opening us up to **runtime errors**.
    * The database configures fields or field range indexes that are not referenced by the code, leading to larger memory and storage footprints than necessary.
