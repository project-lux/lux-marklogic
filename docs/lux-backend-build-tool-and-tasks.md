## **LUX Backend Build Tool and Tasks**

- [Introduction](#introduction)
- [LUX Gradle Tasks](#lux-gradle-tasks)
- [Gradle Tips \& Tricks](#gradle-tips--tricks)

# Introduction

[Gradle](https://gradle.org/) is the selected backend's build tool, primarily as it is the preferred tool for MarkLogic for which there is a [MarkLogic (ML) Gradle plugin](https://github.com/marklogic-community/ml-gradle) offering an extensive set of Gradle tasks to perform a wide variety of actions.  Most commonly, it is used to configure MarkLogic clusters and deploy code.  It may also be used to run MLCP, CoRB, and more.  ML Gradle links: [Wiki](https://github.com/marklogic-community/ml-gradle/wiki), [examples](https://github.com/marklogic-community/ml-gradle/tree/master/examples).

This document describes Gradle tasks written for this project, which may be found in [/build.gradle](/build.gradle).  There's also a tips and tricks section.

# LUX Gradle Tasks

| Task | Description | More Info |
| ---- | ----------- | --------- |
| `addSupportForExecutingWithServiceAccounts` | **Deployment task** that generates amps and libWrapper.mjs in support of enabling logged in users to have access to the same documents a service account has access to. This is part of the ability enabling users to log in yet be restricted to a unit portal's data. The `endpointAccessUnitNames` build property determines which units this support is added for. |  |
| `copyContentDatabaseConfGenerated` | **Deployment task** that provides populates a JavaScript-template with the database's configuration, thereby making it available to the runtime code. |  | 
| `copyDatabase` | Developer convenience task that enables one to copy the data from one database to another, such as from a LUX shared environment to one's local environment. It uses MLCP. | See [Alternative 2: Copy a Database](/docs/lux-backend-import-data.md#alternative-2-copy-a-database) |
| `determineCodeVersion` | Executes a script to derive the code version from `git`. |  |
| `disableDeprecatedSSLProtocols` | Disable deprecated SSL protocols. |  |
| `disableSSL` | Manual **deployment task** that disables SSL which then requires non-SSL connections on app serves. |  |
| `enableSSL` | Manual **deployment task** that enables SSL which then requires SSL connections on app serves. |  |
| `generateAdvancedSearchConfig` | **Deployment task** that generates configuration geared towards an advanced search user interface. One configuration for each unit specified by the `endpointAccessUnitNames` build property, plus the full configuration LUX (all units). This task must run after `generateRemainingSearchTerms` as its input is that task's output. |  |
| `generateRelatedListsConfig` | **Deployment task** that generates configuration for related lists, specifically including their search criteria, in the LUX JSON Search Grammar. One configuration for each unit specified by the `endpointAccessUnitNames` build property, plus the full configuration LUX (all units). This task must run after `generateRemainingSearchTerms` as its input is that task's output. |  |
| `generateRemainingSearchTerms` | **Deployment task** that adds facet, hop inverse, type, ID, and IRI search terms to the hard-coded ones defined in [/src/main/ml-modules/root/config/searchTermsConfig.mjs](/src/main/ml-modules/root/config/searchTermsConfig.mjs).  One set for each unit specified by the `endpointAccessUnitNames` build property, plus a full set for LUX (all units).  Added search terms are only in the deployed copy of searchTermsConfig.mjs.  Facet search terms are derived from [/src/main/ml-modules/root/config/facetsConfig.mjs](/src/main/ml-modules/root/config/facetsConfig.mjs).  Hop inverse search terms are derived from hard-coded search terms with the `hopInverseName` property.  Type and IRI search terms are added to each search scope. |  |
| `importDataFull` | Loads data after clearing the database first. | See [Import Data](/docs/lux-backend-import-data.md) |
| `importDataIncremental` | Loads data without clearing the database first. | See [Import Data](/docs/lux-backend-import-data.md) |
| `importRestApiOptions` | **Deployment task** responsible for configuring the tenant's second application server with the same REST API options that are deployed by `mlLoadModules` for the tenant's first application server. See [/build.gradle](/build.gradle) for when this task will automatically run. |  |
| `performBaseDeployment` | Primary but not initial **deployment task** bundling non-security deployment tasks into one, and is intended to be executed by those with the [%%mlAppName%%-deployer](/src/main/ml-config/base/security/roles/5-tenant-deployer-role.json) role. See [/build.gradle](/build.gradle) for all other tasks that this will run. | See [Deploy Entire Backend](/docs/lux-backend-deployment.md#deploy-entire-backend) |
| `preprocessBuildSupportScripts` | **Deployment task** that copies the contents of [/scripts/buildSupport/](/scripts/buildSupport/) within the build directory, resolving property references in the process.  Other Gradle tasks load scripts from within /build/buildSupport/, including `setBanner`.  Facilitates maintaining JavaScript and XQuery scripts outside the build script.  Use `%%propertyName%%` to reference a build property. This task is set up to run before all other custom tasks, less `preprocessRuntimeConfigAndModules`. |  |
| `preprocessRuntimeConfigAndModules` | **Deployment task** enabling custom token support within the ML Gradle configuration files and the modules. Introduced to allow multiple databases configuration files to share the same index configuration. This task needs to **always** run before any other task that references files within directories specified by the `mlConfigPaths` property.  To avoid defining and maintaining a complete list, the task is the first custom task in [/build.gradle](/build.gradle) and runs with *every* Gradle task --a bit overkill but less likely to drive someone batty trying to figure out why there configuration change isn't being deployed. | See [Custom Token Replacement](/docs/lux-backend-deployment.md#custom-token-replacement) |
| `printCredentials` | Means to display encrypted credentials in plain text.  For your eyes only. |  |
| `restrictUnitTestingDeployment` | **Deployment task** that automatically runs and is intended to prevent the unit testing configuration from reaching a production environment.  Set the `productionEnvironmentNames` property to all environments that can be part of a production environment (e.g., 'blue, green'). |  |
| `setBanner` | **Deployment task** that sets the banner within the MarkLogic admin, query, and monitoring consoles. We use this to clearly identify an environment. There are three associated build properties: `bannerLabel`, `bannerHeaderColor`, and `bannerHeaderTextColor`.  This task is configured to automatically run after `mlDeploySecurity` (since `setBanner` also requires an admin). This task may also be called directly. |  |
| `showAppServerCiphers` | Display ciphers enabled on the application server. Use to ensure those that should not be enabled are not enabled. |  |
| `showDeprecatedSSLProtocols` | Display deprecated SSL protocols. |  |
| `updateSSLCiphers` | Sets hard-coded ciphers on app servers. |  |

# Gradle Tips & Tricks

To view all Gradle tasks available to a project:

`./gradlew tasks`

To "search" for a task related to a resource you have in mind ("database", in this case):

`./gradlew tasks | grep -i database`

To view resolved property values:

`./gradlew properties -PenvironmentName=[name]`

...`grep` works good on that one too.

You do not have to enter the full Gradle task's name ...just enough to be unique from others.  Also, case doesn't matter.  Example: `mlloadmod` and `mlwat` resolve to `mlLoadModules` and `mlWatch`, respectively.

There's lots of great documentation, starting with the [ML Gradle wiki pages](https://github.com/marklogic-community/ml-gradle/wiki).  Their landing page includes a list of helpful links, including references on ports, properties, resources, and tasks.
