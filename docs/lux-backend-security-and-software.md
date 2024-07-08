## **LUX Backend Security and Software**

- [Security](#security)
  - [MarkLogic](#marklogic)
  - [Security Roles](#security-roles)
    - [Reader](#reader)
    - [Endpoint Consumer](#endpoint-consumer)
    - [Query Console](#query-console)
    - [Writer](#writer)
    - [Deployer](#deployer)
- [Software](#software)
  - [Updates](#updates)
  - [Inventory](#inventory)

# Security

## MarkLogic

MarkLogic has many security features.  LUX utilizes role security, both at the REST API and document levels.  The role to grant authorized LUX backend API consumers is described in the next section.  For more information on MarkLogic security features, please refer to [Marklogic's Security Guide](https://docs.marklogic.com/guide/security).

## Security Roles

Each LUX-based tenant within a shared environment is to have a set of tenant-specific roles.  The configuration files use `%%mlAppName%%` to achieve this.

A role restricted to administering a single tenant/application does not yet exist.  Once deemed necessary, a cluster administrator could grant granular privileges to one or more of a tenant's roles.  [Granular privileges](https://docs.marklogic.com/11.0/guide/security-guide/en/granular-privileges/categories-of-granularity/privileges-to-administer-a-specific-aspect-of-a-specific-resource.html) may be used to enable tenants to perform necessary operations on their resources but not on another tenant's resources (e.g., clear database).  Other aspects of the project may need to be worked over in order to take some execute privileges away, specifically but not limited to http://marklogic.com/xdmp/privileges/xdmp-*-in.

### Reader

The [%%mlAppName%%-reader](/src/main/ml-config/base/security/roles/1-tenant-reader-role.json) role probably should be able to read documents in the content database, if not also execute code in the modules database; but, at present, it only has the `rest-reader` role.

### Endpoint Consumer

The [%%mlAppName%%-endpoint-consumer](/src/main/ml-config/base/security/roles/2-tenant-endpoint-consumer-role.json) role is the first role explicitly intended to have LUX backend capabilities.  It is intended to be granted to the middle tier, and should be able to perform everything backend endpoint consumers need, including searching for documents and retrieving documents.  Developers are encouraged to test endpoints using a user account that has this role.

For internal security environments, the project offers the [%%mlAppName%%-endpoint-consumer](/src/main/ml-config/base-unsecured/security/users/tenant-endpoint-consumer-user.json) *user account*, which is granted the endpoint consumer role.  To deploy, set the `tenantEndpointConsumerPassword` in the properties file (It is not an encrypted password.), add [/src/main/ml-config/base-unsecured](/src/main/ml-config/base-unsecured) to the `mlConfigPaths` property value, and run the `mlDeployUsers` task or a higher one.  

### Query Console

The [%%mlAppName%%-qconsole-user](/src/main/ml-config/base/security/roles/3-tenant-qconsole-user.json) role builds upon the [%%mlAppName%%-endpoint-consumer](/src/main/ml-config/base/security/roles/2-tenant-endpoint-consumer-role.json) role by also allowing one to use Query Console.  These users are not able to modify documents in the content or modules database.

### Writer

The [%%mlAppName%%-writer](/src/main/ml-config/base/security/roles/4-tenant-writer-role.json) role builds upon the [%%mlAppName%%-qconsole-user](/src/main/ml-config/base/security/roles/3-tenant-qconsole-user.json) role by also being able to insert, update, and delete documents in the content and modules database, whether through ML Gradle, MLCP, Query Console, etc.

### Deployer

The [%%mlAppName%%-deployer](/src/main/ml-config/base/security/roles/5-tenant-deployer-role.json) role builds upon the [%%mlAppName%%-writer](/src/main/ml-config/base/security/roles/4-tenant-writer-role.json) role by also being able to run the `performBaseDeployment` task.  This role should not be able to run the `mlDeploySecurity` task or lower level security tasks, specifically creating user accounts, changing a user account's roles and privileges, and changing a role's inherited roles and privileges.

For internal security environments, the project offers the [%%mlAppName%%-deployer](/src/main/ml-config/base-unsecured/security/users/tenant-deployer-user.json) *user account*, which is granted the deployer role.  To deploy, set the `tenantDeployerPassword` in the properties file (It is not an encrypted password.), add [/src/main/ml-config/base-unsecured](/src/main/ml-config/base-unsecured) to the `mlConfigPaths` property value, and run the `mlDeployUsers` task or a higher one.

# Software

## Updates

One or more individuals on the project should monitor for software updates and security patches, ideally being notified when one becomes available.

For MarkLogic, if you haven't already created a MarkLogic Developer account or attended training, go to the bottom of https://developer.marklogic.com/engage/ and click the Sign Me Up button.

For the eight or so GitHub repositories LUX uses, "watch" the repo for issues, releases, and security alerts.

That leaves a few that one either needs to periodically check or see if they offer automated notifications.  Read on for the complete list.

For version compatibility questions, see [MarkLogic's Product Support Matrix](https://developer.marklogic.com/products/support-matrix/).

## Inventory

| Software | Version | Build Property | Link | Notes |
|----------|---------|----------------|------|-------|
| MarkLogic Server | 11.0.3 | n/a | https://developer.marklogic.com/products/marklogic-server | | 
| MarkLogic AWS CloudFormation Template (CFT) | 11.0.3 | n/a | https://github.com/marklogic/cloud-enablement-aws/tree/11.0-master | LUX uses a modified version, maintained in a private repo. |
| MarkLogic Content Pump (MLCP) | 11.0.3 | `mlcpVersion` | https://github.com/marklogic/marklogic-contentpump | Loading content in MarkLogic. |
| Gradle | 7.4.2 | n/a | https://github.com/gradle/gradle | Post-CFT deployment. |
| MarkLogic Gradle Plugin | 4.3.4 | `mlGradleVersion` | https://github.com/marklogic-community/ml-gradle | Post-CFT deployment. |
| MarkLogic Node Module | ^3.3.0 | n/a | https://www.npmjs.com/package/marklogic | To check the version used by LUX's middle tier, check its [package.json](https://github.com/project-lux/lux-middletier/blob/main/package.json). For additional information, see [Generated Data Service Interfaces](./lux-backend-api-usage.md#generated-data-service-interfaces). |
| Gradle Credentials Plugin (nu.studer.credentials) | 3.0 | `nuStuderCredentialsVersion` | https://github.com/etiennestuder/gradle-credentials-plugin | Used to avoid clear text passwords in the Gradle properties files. |
| Gradle Properties Plugin (net.saliman.properties) | 1.5.2 | `netSalimonPropertiesVersion` | https://github.com/stevesaliman/gradle-properties-plugin | Provides support for `gradle-[name].properties` files. |
| `org.json:json` | 20220320 | `orgJsonVersion` | https://search.maven.org/artifact/org.json/json | Provides CSV to JSON support to the `processSearchTagConfig` Gradle task. |
| `org.apache.commons:commons-csv` | 1.5.1-marklogic | `orgApacheCommonsCsvVersion` | https://search.maven.org/artifact/org.apache.commons/commons-csv | Provides/extends CSV support to MLCP. |
| OpenJDK | 11.0.15 | n/a | https://openjdk.java.net/ | Required to run Gradle, MLCP, and CoRB. |
| Git | 2.45.0 | n/a | https://git-scm.com/downloads | Source control. |
| Visual Studio Code | Latest* | n/a | https://code.visualstudio.com/Download | IDE |
| Docker Desktop | Latest* | n/a | https://www.docker.com/products/docker-desktop | Those with a Docker subscription or otherwise in compliance with their [Pricing & Subscriptions](https://www.docker.com/pricing/) may optionally create their local developer environment using Docker. |

\* Presumes developer has auto updates or keeps up on the updates.

