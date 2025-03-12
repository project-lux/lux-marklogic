## **LUX Backend Security and Software**

- [Security](#security)
  - [MarkLogic Server](#marklogic-server)
  - [Tenants](#tenants)
  - [Unit Portals](#unit-portals)
    - [Document Access](#document-access)
    - [Applicable Configuration](#applicable-configuration)
    - [Connecting to MarkLogic](#connecting-to-marklogic)
  - [Security Roles](#security-roles)
    - [Reader](#reader)
    - [Endpoint Consumer](#endpoint-consumer)
    - [Query Console](#query-console)
    - [Writer](#writer)
    - [Deployer](#deployer)
    - [Status Builtins](#status-builtins)
  - [Amps](#amps)
- [Software](#software)
  - [Updates](#updates)
  - [Inventory](#inventory)

# Security

## MarkLogic Server

LUX utilizes MarkLogic Server's role security, both at the REST API and document levels.  Each LUX deployment is provided a base set of roles.  These roles are specific to a tenant.  Tenants supporting unit portals are also provided a couple unit-specific roles.  For more on tenants, unit portals, and roles as implemented in LUX, read on!  To learn more about MarkLogic Server security features, please refer to the [MarkLogic Server Security Guide](https://docs.marklogic.com/guide/security).

## Tenants

Each MarkLogic Server cluster has at least one tenant.  A tenant is provided a set of MarkLogic resources enabling a single environment to host multiple applications.  The set of MarkLogic resources includes a content database, modules database, at least two application servers, and security roles.  The tenant's [Reader](#reader) role is granted to the documents.  Tenant user accounts are granted roles that inherit the same [Reader](#reader) role.  This includes service accounts.  For more information on tenants, see [Tenant Configuration](/docs/lux-backend-deployment.md#tenant-configuration).

## Unit Portals

A single tenant can support multiple unit portals.  A unit portal is a website that has access to a subset of data.  A more generic and supported use case is enabling a unit to consume LUX's backend endpoints while being restricted to subset of data associated to their unit.

A unit's data is comprised of data provided by a single Yale library or museum (the unit) plus documents it shares with other units, such as concepts they have in common.  The unit is to authenticate into MarkLogic using a service account that is granted a unit-specific [Endpoint Consumer](#endpoint-consumer) role.  It is the endpoint consumer role that restricts access to documents and determines the applicable configuration.

Regardless of a tenant offering unit service accounts, every tenant offers a service account that has access to all of the documents and superset of configurations.  https://lux.collections.yale.edu/ uses such an account.

### Document Access

When content is loaded, [documentTransforms.sjs](/src/main/ml-modules/root/documentTransforms.sjs) is responsible for granting read permission to the documents the unit should have access to.  The unit's endpoint consumer role inherits the unit's [Reader](#reader) role.  MarkLogic Server security takes it from there.

### Applicable Configuration

To better align with data available to the unit, several endpoints utilize configuration that may vary by endpoint consumer role.

Here's how it works:

* Set the `endpointAccessUnitNames` build property to the units that require unit-specific configurations.  This will likely be a subset of units represented in the `/admin/sources` array.  While a (unit-specific) reader role is required for every unit that may appear in the `/admin/sources` array, only units that intend to consume endpoints restricted to their data are required to be included in the `endpointAccessUnitNames` property's value, have an endpoint consumer role, and a service account.
* Within [searchTermsConfig.mjs](/src/main/ml-modules/root/config/searchTermsConfig.mjs), the `onlyForUnits` and `excludedUnits` arrays control which units have access to entire search scopes and specific search terms.
* The array values should be unit names, and should match `[unitName]` in the `%%mlAppName%%-[unitName]-endpoint-consumer` role names (case-sensitive).
* When both arrays are set on the same search scope or search term, `onlyForUnits` takes precedence.
* The default is to provide all search scopes and search terms to all units.
* "lux" is a reserved value and represents an endpoint consumer that has access to all documents and configuration.  The only time it makes sense to use that value in one of these arrays is to suppress a search scope or search term from all endpoint consumers with restricted access: `"onlyForUnits": ["lux"]`.
* The logic is encapsulated within `isConfiguredForUnit` of [unitLib.mjs](/src/main/ml-modules/root/lib/unitLib.mjs).
* The [remaining search term generator](/src/main/ml-modules/root/runDuringDeployment/generateRemainingSearchTerms.mjs) is responsible for calling `isConfiguredForUnit` everywhere it needs to.  Its output is the input for the [advanced search configuration generator](/src/main/ml-modules/root/runDuringDeployment/generateAdvancedSearchConfig.mjs) and [related lists generator](/src/main/ml-modules/root/runDuringDeployment/generateRelatedListsConfig.mjs).
* At runtime, the applicable configuration is derived from the user's endpoint role.

### Connecting to MarkLogic

Each participating unit is to provide a frontend and configure their middle tier to two MarkLogic application servers, accessible via load balancer (provided).  The unit is to use its service account to authenticate into the application servers.  

## Security Roles

Each LUX-based tenant within a shared environment is to have a set of tenant-specific roles.  The configuration files use `%%mlAppName%%` to achieve this.

A role restricted to administering a single tenant/application does not yet exist.  Once deemed necessary, a cluster administrator could grant granular privileges to one or more of a tenant's roles.  [Granular privileges](https://docs.marklogic.com/11.0/guide/security-guide/en/granular-privileges/categories-of-granularity/privileges-to-administer-a-specific-aspect-of-a-specific-resource.html) may be used to enable tenants to perform necessary operations on their resources but not on another tenant's resources (e.g., clear database).  Other aspects of the project may need to be worked over in order to take some execute privileges away, specifically but not limited to http://marklogic.com/xdmp/privileges/xdmp-*-in.

### Reader

Each tenant and unit is to have a dedicated reader role.  The tenant's reader role is defined by [1-tenant-reader-role.json](/src/main/ml-config/base/security/roles/1-tenant-reader-role.json).  Reader roles are the most restricted in the system.  They are granted read permission to all or a subset of documents --but not the ability to get to them via endpoint.

Reader roles are not to inherit another reader role.

Additional reader roles are configured within [/src/main/ml-config/base/security/roles](/src/main/ml-config/base/security/roles/).

Reader role naming conventions for units, where `[alpha]` is the next available letter and `[unit]` uniquely identifies the unit:

* File names: `1[letter]-[unit]-reader-role.json`
* Role names: `%%mlAppName%%-[unit]-reader`

**IMPORTANT:** When loading content, [documentTransforms.sjs](/src/main/ml-modules/root/documentTransforms.sjs) requires `[unit]` to be the value used for the unit within the `/admin/sources` array.

### Endpoint Consumer

Each tenant and unit is to have a dedicated endpoint consumer role.  The tenant's endpoint consumer role is defined by [2-tenant-endpoint-consumer-role.json](/src/main/ml-config/base/security/roles/2-tenant-endpoint-consumer-role.json).  Endpoint consumer roles are the first ones explicitly intended to have LUX backend capabilities.  Middle tiers may use service accounts that have one of these roles to authenticate into a tenant's application servers.  These roles should enable everything backend endpoint consumers need, including searching for and retrieving documents.  

Endpoint consumer roles are not to inherit another endpoint consumer role.

Additional endpoint consumer roles are configured within [/src/main/ml-config/base/security/roles](/src/main/ml-config/base/security/roles/).

Endpoint consumer role naming conventions for units, where `[alpha]` and `[unit]` match that of the reader role:

* File names: `2[alpha]-[unit]-endpoint-consumer-role.json`
* Role names: `%%mlAppName%%-[unit]-endpoint-consumer`

For internal security environments, the project offers tenant and unit endpoint consumer service accounts.  These are configured within [/src/main/ml-config/base-unsecured/security/users](/src/main/ml-config/base-unsecured/security/users).  To deploy, set the `endpointConsumerPassword` in the properties file (It is not an encrypted password.), add [/src/main/ml-config/base-unsecured](/src/main/ml-config/base-unsecured) to the `mlConfigPaths` property value, and run the `mlDeployUsers` task or a higher one.  

Developers are encouraged to test endpoints using a user account that has one of these roles.

### Query Console

The [%%mlAppName%%-qconsole-user](/src/main/ml-config/base/security/roles/3-tenant-qconsole-user.json) role builds upon the [%%mlAppName%%-endpoint-consumer](/src/main/ml-config/base/security/roles/2-tenant-endpoint-consumer-role.json) role by also allowing one to use Query Console.  These users are not able to modify documents in the content or modules database.

### Writer

The [%%mlAppName%%-writer](/src/main/ml-config/base/security/roles/4-tenant-writer-role.json) role builds upon the [%%mlAppName%%-qconsole-user](/src/main/ml-config/base/security/roles/3-tenant-qconsole-user.json) role by also being able to insert, update, and delete documents in the content and modules database, whether through ML Gradle, MLCP, Query Console, etc.

### Deployer

The [%%mlAppName%%-deployer](/src/main/ml-config/base/security/roles/5-tenant-deployer-role.json) role builds upon the [%%mlAppName%%-writer](/src/main/ml-config/base/security/roles/4-tenant-writer-role.json) role by also being able to run the `performBaseDeployment` task.  This role should not be able to run the `mlDeploySecurity` task or lower level security tasks, specifically creating user accounts, changing a user account's roles and privileges, and changing a role's inherited roles and privileges.

For internal security environments, the project offers the [%%mlAppName%%-deployer](/src/main/ml-config/base-unsecured/security/users/tenant-deployer-user.json) *user account*, which is granted the deployer role.  To deploy, set the `deployerPassword` in the properties file (It is not an encrypted password.), add [/src/main/ml-config/base-unsecured](/src/main/ml-config/base-unsecured) to the `mlConfigPaths` property value, and run the `mlDeployUsers` task or a higher one.

### Status Builtins

The [%%mlAppName%%-status-builtins](/src/main/ml-config/base/security/roles/6-status-builtins-role.json) role is only intended to be configured to amps. It was introduced to enable endpoint consumers to consume the [Storage Info](/docs/lux-backend-api-usage.md#storageInfo) endpoint without granting that role an executive privilege that offers potentially sensitive information.

## Amps

The [getForestInfoByHost](/src/main/ml-config/base/security/amps/get-forest-info-by-host-amp.json) amp allows [environmentLib.mjs](/src/main/ml-modules/root/lib/environmentLib.mjs)'s `getForestInfoByHost` function to run with the [%%mlAppName%%-status-builtins](/src/main/ml-config/base/security/roles/6-status-builtins-role.json) execute role. That role is configured with an execute privilege that is required to retrieve forest storage information.

# Software

## Updates

One or more individuals on the project should monitor for software updates and security patches, ideally being notified when one becomes available.

For MarkLogic Server, if you haven't already created a MarkLogic Developer account or attended training, go to the bottom of https://developer.marklogic.com/engage/ and click the Sign Me Up button.

For the eight or so GitHub repositories LUX uses, "watch" the repo for issues, releases, and security alerts.

That leaves a few that one either needs to periodically check or see if they offer automated notifications.  Read on for the complete list.

For version compatibility questions, see the [MarkLogic Server Product Support Matrix](https://developer.marklogic.com/products/support-matrix/).

## Inventory

| Software | Version | Build Property | Link | Notes |
|----------|---------|----------------|------|-------|
| MarkLogic Server | 11.3.1 | n/a | https://developer.marklogic.com/products/marklogic-server | | 
| MarkLogic AWS CloudFormation Template (CFT) | 11.3.1 | n/a | https://github.com/marklogic/cloud-enablement-aws/tree/11.0-master | LUX uses a modified version, maintained in a private repo. |
| MarkLogic Content Pump (MLCP) | 11.3.1 | `mlcpVersion` | https://github.com/marklogic/marklogic-contentpump | Loading content in MarkLogic. |
| Gradle | 8.13 | n/a | https://github.com/gradle/gradle | Post-CFT deployment. |
| MarkLogic Gradle Plugin | 5.0.0 | `mlGradleVersion` | https://github.com/marklogic-community/ml-gradle | Post-CFT deployment. |
| MarkLogic Node Module | ^3.3.0 | n/a | https://www.npmjs.com/package/marklogic | To check the version used by LUX's middle tier, check its [package.json](https://github.com/project-lux/lux-middletier/blob/main/package.json). For additional information, see [Generated Data Service Interfaces](./lux-backend-api-usage.md#generated-data-service-interfaces). |
| Gradle Credentials Plugin (nu.studer.credentials) | 3.0 | `nuStuderCredentialsVersion` | https://github.com/etiennestuder/gradle-credentials-plugin | Used to avoid clear text passwords in the Gradle properties files. |
| Gradle Properties Plugin (net.saliman.properties) | 1.5.2 | `netSalimonPropertiesVersion` | https://github.com/stevesaliman/gradle-properties-plugin | Provides support for `gradle-[name].properties` files. |
| `org.json:json` | 20220320 | `orgJsonVersion` | https://search.maven.org/artifact/org.json/json | Provides CSV to JSON support to the `processSearchTagConfig` Gradle task. |
| `org.apache.commons:commons-csv` | 1.5.1-marklogic | `orgApacheCommonsCsvVersion` | https://search.maven.org/artifact/org.apache.commons/commons-csv | Provides/extends CSV support to MLCP. |
| OpenJDK | 17.0.8 | n/a | https://openjdk.java.net/ | Required to run Gradle, MLCP, and CoRB. |
| Git | 2.45.2 | n/a | https://git-scm.com/downloads | Source control. |
| Visual Studio Code | Latest* | n/a | https://code.visualstudio.com/Download | IDE |
| Docker Desktop | Latest* | n/a | https://www.docker.com/products/docker-desktop | Those with a Docker subscription or otherwise in compliance with their [Pricing & Subscriptions](https://www.docker.com/pricing/) may optionally create their local developer environment using Docker. |

\* Presumes developer has auto updates or keeps up on the updates.

