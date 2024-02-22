## **LUX Backend Security and Software**

- [Security](#security)
  - [MarkLogic](#marklogic)
  - [LUX Backend Roles](#lux-backend-roles)
    - [Nobody](#nobody)
    - [Reader](#reader)
    - [Endpoint Consumer](#endpoint-consumer)
    - [Query Console](#query-console)
    - [Writer](#writer)
    - [Deployer](#deployer)
    - [LUX Admin](#lux-admin)
    - [MarkLogic Admin](#marklogic-admin)
- [Software](#software)
  - [Updates](#updates)
  - [Inventory](#inventory)

# Security

## MarkLogic

MarkLogic has many security features.  LUX utilizes role security, both at the REST API and document levels.  The role to grant authorized LUX backend API consumers is described in the next section.  For more information on MarkLogic security features, please refer to [Marklogic's Security Guide](https://docs.marklogic.com/guide/security).

## LUX Backend Roles

This project defines the following roles, which are intended to build upon one another enabling us to restrict capabilities by sets of users.  Several of these originated from running ML Gradle's `mlNewProject` task, but may not actually be able to do anything in LUX, yet.

### Nobody

The [lux-nobody](/src/main/ml-config/base/security/roles/1-lux-nobody-role.json) role is not granted any permissions or roles, and is not presently utilized.

### Reader

The [lux-reader](/src/main/ml-config/base/security/roles/2-lux-reader-role.json) role probably should be able to read documents in the content database, if not also execute code in the modules database; but, at present, it only has the `rest-reader` role.

### Endpoint Consumer

The [lux-endpoint-consumer](/src/main/ml-config/base/security/roles/3-lux-endpoint-consumer-role.json) role is the first role explicitly intended to have LUX Backend capabilities.  It is intended to be granted to the middle tier, and should be able to perform everything backend endpoint consumers need, including searching for documents and retrieving documents.  Developers are encouraged to test endpoints using a user account that has this role.

For internal security environments, the project offers the `lux-endpoint-consumer` user account, which is granted the `lux-endpoint-consumer` role.  To deploy, set the `luxEndpointConsumerPassword` in the properties file (It is not an encrypted password.), add [/src/main/ml-config/base-unsecured](/src/main/ml-config/base-unsecured) to the `mlConfigPaths` property value, and run the `mlDeployUsers` task or a higher one.  

At this time, the `lux-endpoint-consumer` role could also execute arbitrary SPARQL using the native `/v1/graphs/sparql` endpoint.  This is not desired as the queries could be non-performant, slowing the system.  The conflict is a lack of granularity in built-in REST-related roles and the aforementioned endpoint only requiring the `rest-reader` role --the same role that otherwise best meets the `lux-endpoint-consumer` role's needs.  Mutually-exclusive options to prevent use of the `/v1/graphs/sparql` endpoint (and possibly other endpoints):

* Grant the `lux-endpoint-consumer` role the `rest-extension-user` role instead of `rest-reader`.  This would allow the `lux-endpoint-consumer` role to consume data services, which is technically all this role needs today.  All native endpoints would be blocked, which oddly includes `/v1/resources`.  We could wait and see if `lux-endpoint-consumer` role needs more than data services.
* Introduce a custom URL rewriter on any application server for backend endpoint consumers.  Only expose the few endpoints those consumers require.  The list of endpoints may be limited to those defined in [/docs/lux-backend-api-usage.md](/docs/lux-backend-api-usage.md).
* Submit a MarkLogic RFE.
* Block requests before they reach MarkLogic's application servers.

### Query Console

The [lux-qconsole-user](/src/main/ml-config/base/security/roles/4-lux-qconsole-user.json) role builds upon the [lux-endpoint-consumer](/src/main/ml-config/base/security/roles/3-lux-endpoint-consumer-role.json) role by also allowing one to use Query Console.  These users are not able to modify documents in the content or modules database.

### Writer

The [lux-writer](/src/main/ml-config/base/security/roles/5-lux-writer-role.json) role builds upon the [lux-qconsole-user](/src/main/ml-config/base/security/roles/4-lux-qconsole-user.json) role by also being able to insert, update, and delete documents in the content and modules database, whether through ML Gradle, MLCP, Query Console, etc.

### Deployer

The [lux-deployer](/src/main/ml-config/base/security/roles/6-lux-deployer-role.json) role builds upon the [lux-writer](/src/main/ml-config/base/security/roles/5-lux-writer-role.json) role by also being able to run the `performBaseDeployment` task.  This role should not be able to run the `mlDeploySecurity` task or lower level security tasks, specifically creating user accounts, changing a user account's roles and privileges, and changing a role's inherited roles and privileges.

For internal security environments, the project offers the `lux-deployer` user account, which is granted the `lux-deployer` role.  To deploy, set the `luxDeployerPassword` in the properties file (It is not an encrypted password.), add [/src/main/ml-config/base-unsecured](/src/main/ml-config/base-unsecured) to the `mlConfigPaths` property value, and run the `mlDeployUsers` task or a higher one.

### LUX Admin

The [lux-admin](/src/main/ml-config/base/security/roles/7-lux-admin-role.json) builds upon the [lux-deployer](/src/main/ml-config/base/security/roles/6-lux-deployer-role.json) role by also having the xdbc:insert-in privilege.

The history or need for this role is not clear.

### MarkLogic Admin

The [lux-ml-admin](/src/main/ml-config/base/security/roles/8-lux-ml-admin-role.json) role inherits MarkLogic's built-in "admin" role.  Users with this role practically have full access and capabilities within MarkLogic.  As such, this role should be granted sparingly and those with this role should use extra caution.

For LUX Backend deployments, this role is required for security-related tasks, including the `mlDeploySecurity` task.


# Software

## Updates

One or more individuals on the project should monitor for software updates and security patches, ideally being notified when one becomes available.

For MarkLogic, if you haven't already created a MarkLogic Developer account or attended training, go to the bottom of https://developer.marklogic.com/engage/ and click the Sign Me Up button.

For the eight or so GitHub repositories LUX uses, "watch" the repo for issues, releases, and security alerts.

That leaves a few that one either needs to periodically check or see if they offer automated notifications.  Read on for the complete list.

For version compatibility questions, see [MarkLogic's Product Support Matrix](https://developer.marklogic.com/products/support-matrix/).

## Inventory

| Software | Version | Property | Link | Notes |
|----------|---------|----------|------|-------|
| MarkLogic Server | 11.0.3 | n/a | https://developer.marklogic.com/products/marklogic-server | | 
| MarkLogic AWS CloudFormation Template (CFT) | 11.0.3 | n/a | https://github.com/marklogic/cloud-enablement-aws/tree/11.0-master | LUX uses a modified version, embedded within [/cluster-formation/main.tf](/cluster-formation/main.tf).  For more information, please see [Cluster Formation via Terraform](/docs/lux-backend-deployment.md#cluster-formation-via-terraform). |
| MarkLogic Content Pump (MLCP) | 11.0.3 | `mlcpVersion` | https://github.com/marklogic/marklogic-contentpump | Loading content in MarkLogic. |
| Gradle | 7.4.2 | n/a | https://github.com/gradle/gradle | Post-CFT deployment. |
| MarkLogic Gradle Plugin | 4.3.4 | `mlGradleVersion` | https://github.com/marklogic-community/ml-gradle | Post-CFT deployment. |
| MarkLogic Node Module | ^3.3.0 | n/a | https://www.npmjs.com/package/marklogic | To check the version used by LUX's middle tier, head over to its repo and check package.json. For additional information, see [Generated Data Service Interfaces](./lux-backend-api-usage.md#generated-data-service-interfaces). |
| Gradle Credentials Plugin (nu.studer.credentials) | 3.0 | `nuStuderCredentialsVersion` | https://github.com/etiennestuder/gradle-credentials-plugin | Used to avoid clear text passwords in the Gradle properties files. |
| Gradle Properties Plugin (net.saliman.properties) | 1.5.2 | `netSalimonPropertiesVersion` | https://github.com/stevesaliman/gradle-properties-plugin | Provides support for `gradle-[env].properties` files. |
| `org.json:json` | 20220320 | `orgJsonVersion` | https://search.maven.org/artifact/org.json/json | Provides CSV to JSON support to the `processSearchTagConfig` Gradle task. |
| `org.apache.commons:commons-csv` | 1.5.1-marklogic | `orgApacheCommonsCsvVersion` | https://search.maven.org/artifact/org.apache.commons/commons-csv | Provides/extends CSV support to MLCP. |
| OpenJDK | 11.0.15 | n/a | https://openjdk.java.net/ | Required to run Gradle, MLCP, and CoRB. |
| Git | 2.43.0.windows.1 | n/a | https://git-scm.com/downloads | Source control. |
| Visual Studio Code | Latest* | n/a | https://code.visualstudio.com/Download | IDE |
| Docker Desktop | Latest* | n/a | https://www.docker.com/products/docker-desktop | Those with a Docker subscription or otherwise in compliance with their [Pricing & Subscriptions](https://www.docker.com/pricing/) may optionally create their local developer environment using Docker. |

\* Presumes developer has auto updates or keeps up on the updates.

