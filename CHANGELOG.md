# Changelog

All changes to the MarkLogic (backend) portion of LUX capable of impacting the runtime experience will be documented in this file.  These are to include software, configuration, and environment changes.

## v1.42.0 - 2025-06-30
### Added

### Changed
- The [Update Document endpoint](/docs/lux-backend-api-usage.md#update-document) now requires the `uri` parameter ([#546](https://github.com/project-lux/lux-marklogic/issues/546))
- Corrected the URIs of My Collections documents to include "data/" ([#547](https://github.com/project-lux/lux-marklogic/issues/547))

### Removed
  
### Fixed

### Security

## v1.41.0 - 2025-06-16
### Added
- Added a script which lists roles configured with external names.

### Changed

### Removed
  
### Fixed

### Security

## v1.40.0 - 2025-06-02
### Added
- Automatically create user profile and default collection for new users ([#495](https://github.com/project-lux/lux-marklogic/issues/495))
- Added new sets facet that combines setCreationDate and setPublicationDate [#497](https://github.com/project-lux/lux-marklogic/issues/497)

### Changed
- The [Read Document endpoint](#read-document) will now allow any user or service account to access the portion of another user's profile included by the 'name' profile. ([#502](https://github.com/project-lux/lux-marklogic/issues/502))

### Removed
  
### Fixed

### Security
- In support of backing up My Collections data ([#518](https://github.com/project-lux/lux-marklogic/issues/518)) and future Blue/Green needs, added the [%%mlAppName%%-my-collections-data-updater role](/docs/lux-backend-security-and-software.md#my-collections-data-updater).

## v1.39.0 - 2025-05-05
### Added
- Added the [Create Document endpoint](/docs/lux-backend-api-usage.md#create-document). Only available when the My Collections feature is enabled. Supports My Collection and User Profile documents.  Never available to service accounts. ([#486](https://github.com/project-lux/lux-marklogic/issues/486), [#501](https://github.com/project-lux/lux-marklogic/issues/501), [#512](https://github.com/project-lux/lux-marklogic/issues/512))
- Added the [Update Document endpoint](/docs/lux-backend-api-usage.md#update-document). Only available when the My Collections feature is enabled. Supports My Collection and User Profile documents.  Never available to service accounts. ([#493](https://github.com/project-lux/lux-marklogic/issues/493), [#501](https://github.com/project-lux/lux-marklogic/issues/501), [#512](https://github.com/project-lux/lux-marklogic/issues/512))
- Added the [Delete Document endpoint](/docs/lux-backend-api-usage.md#delete-document). Only available when the My Collections feature is enabled. Supports My Collection documents only.  Never available to service accounts. ([#494](https://github.com/project-lux/lux-marklogic/issues/494), [#501](https://github.com/project-lux/lux-marklogic/issues/501), [#512](https://github.com/project-lux/lux-marklogic/issues/512))
- Added the `userId` and `username` search terms and underlying indexes, within the agent search scope. (Part of [#501](https://github.com/project-lux/lux-marklogic/issues/501))

### Changed
- Changed the Document endpoint (/ds/lux/document.mjs) to the [Read Document endpoint](/docs/lux-backend-api-usage.md#read-document) (/ds/lux/document/read.mjs). This is a **backwards-incompatible** change. ([#512](https://github.com/project-lux/lux-marklogic/issues/512))

### Removed
  
### Fixed

### Security
- As part of [#486](https://github.com/project-lux/lux-marklogic/issues/486) and [#501](https://github.com/project-lux/lux-marklogic/issues/501) (above):
    - Deleted, modified, and added additional [amps](/docs/lux-backend-security-and-software.md#amps).
    - Modified [#475](https://github.com/project-lux/lux-marklogic/issues/475)'s definition of a service account.

## v1.38.1 - 2025-04-08
### Added

### Changed

### Removed
  
### Fixed
- Fixed naming of amp functions for tenants and units with names that contain dashes; related to ([#475](https://github.com/project-lux/lux-marklogic/issues/475)).

### Security

## v1.38.0 - 2025-04-07
### Added
- Enable configuring facets that are composed of multiple sub-facets, and add a 'workCreationOrPublicationDate' facet which is a combination of 'workCreationDate' and 'workPublicationDate' ([#485](https://github.com/project-lux/lux-marklogic/issues/485))

### Changed
- My Collections security and endpoint configuration ([#475](https://github.com/project-lux/lux-marklogic/issues/475)):
     - Changed the endpoint consumer role hierarchy, necessitating the deletion of some user accounts, roles, and amps before running the `mlDeploySecurity` Gradle task; [deleteUsersAndRoles.xqy](/scripts/admin/deleteUsersAndRoles.xqy) and [deleteAmps.xqy](/scripts/admin/deleteAmps.xqy) can assist.
     - The preexisting `endpointAccessUnitNames` build property is now used to generate functions and amps in support of requests from authenticated users having access to the tenant's or a unit's configuration and documents.
     - Many endpoints now accept the `unitName` parameter.  The optional parameter is only used when the My Collections feature is enabled ([#469](https://github.com/project-lux/lux-marklogic/issues/469)) and the authenticated user is not a service account.
     - Introduced extended endpoint configuration ([endpointsConfig.mjs](/src/main/ml-modules/root/config/endpointsConfig.mjs)), enabling us to configure which endpoints are associate to the My Collections feature and which may still be used when the instance is running in read-only mode.
     - Restricted unit test deployments to non-production environments due to the security configuration required by some tests.  Use the new `productionEnvironmentNames` build property to specify which MarkLogic environments can be part of the production environment.
     - See [LUX Backend API Usage](/docs/lux-backend-api-usage.md), [LUX Backend Security and Software](/docs/lux-backend-security-and-software.md), and [LUX Backend Build Tool and Tasks](/docs/lux-backend-build-tool-and-tasks.md) for additional details.
### Removed
  
### Fixed

### Security

## v1.37.0 - 2025-03-24
### Added
 - Reintroduced [MarkLogic's unit test framework](https://marklogic-community.github.io/marklogic-unit-test/) ([#15](https://github.com/project-lux/lux-marklogic/issues/15)) 
 - Introduced the `featureMyCollectionsEnabled` build property which may be used to enable or disable the feature ([#469](https://github.com/project-lux/lux-marklogic/issues/469))
 - Add getSslMinAllowTls and setSslMinAllowTls tasks. These replace disableDeprecatedSSLProtocols and showDeprecatedSslProtocols starting with ML version 12. ([#444](https://github.com/project-lux/lux-marklogic/issues/444))
 - Add stop words to the advanced search config. ([#426](https://github.com/project-lux/lux-marklogic/issues/426))

### Changed
 - Upgraded build environment to Gradle 8.13 and ML Gradle 5.0.0 ([#465](https://github.com/project-lux/lux-marklogic/issues/465))

### Removed
  
### Fixed

### Security

## v1.36.0 - 2025-03-10
### Added
 - Added pageWith parameter to the /search endpoint, which will return the page which contains a specific document id ([#350](https://github.com/project-lux/lux-marklogic/issues/350)).

### Changed

### Removed
  
### Fixed

### Security

## v1.35.1 - 2025-02-25
### Added

### Changed

### Removed
  
### Fixed
- Fixed responsibleUnits facet to allow it to work with Sets ([#458](https://github.com/project-lux/lux-marklogic/issues/458)).

### Security

## v1.35.0 - 2025-02-24
### Added

### Changed
- Made Sets a UI Scope ([#434](https://github.com/project-lux/lux-marklogic/issues/434)).
- Added new indexes, search terms, facets, sorts for Sets scope. ([#435](https://github.com/project-lux/lux-marklogic/issues/435)).
- Add new facets for Works scope (About Events, Items, Sets, Works) ([#448](https://github.com/project-lux/lux-marklogic/issues/448)).
- Change all work.about{Scope} inverse terms to be called subjectOfWork instead of subjectOf{Scope} ([#446](https://github.com/project-lux/lux-marklogic/issues/446)).
- Archives are no longer considered Works, since they are now visible in the UI as Sets (Collections) ([#430](https://github.com/project-lux/lux-marklogic/issues/430)).
- The /stats endpoint is simplified as no scopes have overlapping data types ([#436](https://github.com/project-lux/lux-marklogic/issues/436)).

### Removed
  
### Fixed

### Security

## v1.34.0 - 2025-02-10

### Added
 - Added the Storage Info endpoint which enables consumers to get a summary of the storage usage within a MarkLogic cluster ([#22](https://github.com/project-lux/lux-marklogic/issues/22)).

### Changed

### Removed
  
### Fixed

### Security

## v1.33.0 - 2025-01-27

### Added

### Changed

- Optimized semantic facets to produce results faster ([#365](https://github.com/project-lux/lux-marklogic/issues/365)).
- Add work.aboutEvent and event.subjectOfEvent back to the advanced search config. Use updated predicate for these search terms ([#387](https://github.com/project-lux/lux-marklogic/issues/387)).

### Removed

- Removed the semantic facet timeout override of 59 seconds. Semantic facet requests are now subject to the application server's default timeout of 20 seconds. Associated build property: `viaSearchFacetTimeout`. (Part of [#365](https://github.com/project-lux/lux-marklogic/issues/365))
- Removed the ability to filter searches related to semantic facet requests. Associated facets endpoint parameter: `filterResults`. Associated build property: `filterSemanticFacetSearchResults`. (Part of [#365](https://github.com/project-lux/lux-marklogic/issues/365))
  
### Fixed

### Security

## v1.32.1 - 2025-01-16

### Added

### Changed

- Updated search terms config for predicate names that changed in the 2025-01-10 dataset ([#420](https://github.com/project-lux/lux-marklogic/issues/420)).

### Removed

- Removed the advanced search config for Works About an Event ([#387](https://github.com/project-lux/lux-marklogic/issues/387)).
  
### Fixed

### Security

## v1.32.0 - 2025-01-13

### Added

- Added search term config for Works About an Event ([#387](https://github.com/project-lux/lux-marklogic/issues/387)).

### Changed

### Removed

### Fixed

### Security

## v1.31.0 - 2024-12-16

### Added

### Changed
- Improved performance of queries when a Hop Inverse term is nested inside a Hop With Field term ([#304](https://github.com/project-lux/lux-marklogic/issues/304)).
### Removed

### Fixed

### Security

## v1.30.0 - 2024-12-02

### Added
- Enable Sorting By Semantic Criteria and Provide Various Semantic Sort Options ([#343](https://github.com/project-lux/lux-marklogic/issues/343)).
- Add new Non-Semantic Sorts ([#342](https://github.com/project-lux/lux-marklogic/issues/342)).

### Changed

### Removed

### Fixed

### Security

## v1.29.2 - 2024-11-27

### Added

### Changed

### Removed

### Fixed

- Fixed Part of Set search term for Works, which was modified while creating Part of Work search term ([#234](https://github.com/project-lux/lux-marklogic/issues/234)).

### Security

## v1.29.1 - 2024-11-19

### Added

### Changed
- Modified logic for quoting terms with colons ([#272](https://github.com/project-lux/lux-marklogic/issues/272)).

### Removed

### Fixed

### Security

## v1.29.0 - 2024-11-18

### Added

- Added Part Of Work and Contains Work search terms to Works ([#234](https://github.com/project-lux/lux-marklogic/issues/234)).
- Enabled searching and sorting across multiple scopes ([#318](https://github.com/project-lux/lux-marklogic/issues/318)).
- Enable searching for identifiers without quoting them ([#272](https://github.com/project-lux/lux-marklogic/issues/272)).

### Changed

### Removed

### Fixed

### Security

## v1.28.0 - 2024-11-04

### Added

### Changed

- Exclude Collection Sets from the stats for Works ([#283](https://github.com/project-lux/lux-marklogic/issues/283)).

### Removed

### Fixed

### Security

## v1.27.0 - 2024-10-21

### Added

- Enabled searching for Works whose creation was caused by an Event and vice-versa ([#269](https://github.com/project-lux/lux-marklogic/issues/269)).

### Changed

- Updated Work Is Online facet to include Sets  ([#250](https://github.com/project-lux/lux-marklogic/issues/250)).

- Change Work Created By to include People & Groups that are listed as being creators in part ([#278](https://github.com/project-lux/lux-marklogic/issues/278)).

- Update AAT for archive sorting - used to be sort titles (http://vocab.getty.edu/aat/300451544), now it is sort values (http://vocab.getty.edu/aat/300456575) ([#325](https://github.com/project-lux/lux-marklogic/issues/325)).
  
- Revert workaround in #337 - triple has been restored ([#337](https://github.com/project-lux/lux-marklogic/issues/337)).

### Removed

- Removed "Is the Place of Publication of..." and "...Published At this Place" relationships from Related Lists ([#284](https://github.com/project-lux/lux-marklogic/issues/284)).

### Fixed

### Security

## v1.26.1 - 2024-10-11

### Added

### Changed

### Removed
 
### Fixed

- Fixed issues getting docs with the 'name' profile and primary names ([#290](https://github.com/project-lux/lux-marklogic/issues/290)).

### Security

## v1.26.0 - 2024-10-07

### Added

### Changed

- Workaround for missing 'setClassifiedAs' triple on Collection sets. Sets will use the 'referenceClassifiedAs' triple in the meantime. ([#337](https://github.com/project-lux/lux-marklogic/issues/337)).

- LUX is no longer dependent on generating data constants after data is loaded into the content database. ([#290](https://github.com/project-lux/lux-marklogic/issues/290)).

### Removed
 
### Fixed

### Security

## v1.25.1 - 2024-10-04

### Added

### Changed

### Removed
 
### Fixed

- Fixed '<=' and '>=' comparators for dates ([#332](https://github.com/project-lux/lux-marklogic/issues/332))

### Security

## v1.25.0 - 2024-09-23

### Added

- Added the 'Professional Activity Categorized As' and 'Professional Activity of' search terms to Advanced Search ([#248](https://github.com/project-lux/lux-marklogic/issues/248))
- Added versionInfo endpoint to make the Marklogic Code Version, Date Version, Server Version, Database (Tenant) Name available ([#264](https://github.com/project-lux/lux-marklogic/issues/264))
- Added IPCH user for local deployments ([#314](https://github.com/project-lux/lux-marklogic/issues/314))

### Changed
- Updated help text for ID fields so that they don't prescribe a specific entity type ([#303](https://github.com/project-lux/lux-marklogic/issues/303))

### Removed
 
### Fixed

- Fixed incorrectly configured fields - idIndexReferences should be an array ([#301](https://github.com/project-lux/lux-marklogic/issues/301))

### Security

## v1.24.0 - 2024-09-09

### Added

### Changed

- Update date facets such that they can be sorted more accurately([#256](https://github.com/project-lux/lux-marklogic/issues/256))

### Removed
 
### Fixed

- Updated triples used by search terms so that there are not overlapping triples used for different search scopes. This prevents records of the wrong scope showing up in related lists. (e.g. the Exhibitions concept showing up in Related People & Groups for Pablo Picasso) ([#309](https://github.com/project-lux/lux-marklogic/issues/309))

### Security

- Added reader roles for ILS, IPCH, and PMC. Added reader roles for a couple other values that may be present in the `admin.sources` array: 'create' and 'update'. Added endpoint consumer role for IPCH. Removed endpoint consumer roles for YCBA and YUAG. [#280](https://github.com/project-lux/lux-marklogic/issues/280)

## v1.23.3 - 2024-08-21

### Added

### Changed

### Removed
 
### Fixed

- Fixed tokenization issue that [#273](https://github.com/project-lux/lux-marklogic/issues/273)'s original implementation introduced in v1.23.0.

### Security

## v1.23.2 - 2024-08-21

### Added

### Changed

### Removed
 
### Fixed

- Fixed the triple referenced by work.aboutItem so that it can return results ([#74](https://github.com/project-lux/lux-marklogic/issues/74)).

### Security

## v1.23.1 - 2024-08-19

### Added

### Changed

- Changed units lib to parse units based on %%mlAppName%% instead of 'lux' ([#277](https://github.com/project-lux/lux-marklogic/issues/277))

### Removed
 
### Fixed

### Security

## v1.23.0 - 2024-08-19

### Added

- Added the Objects/Works about/subject of other Objects/Works relationship ([#74](https://github.com/project-lux/lux-marklogic/issues/74)).
- Added the ability to vary the search term, advanced search, and related lists configurations by unit, or more precisely, endpoint consumer.  This has no impact on https://lux.collections.yale.edu/.  For more information, see [Unit Portals](/docs/lux-backend-security-and-software.md#unit-portals), an upcoming feature of LUX. ([#277](https://github.com/project-lux/lux-marklogic/issues/277))

### Changed

### Removed
 
### Fixed

- Fixed search criteria processing for terms containing a phrase and either another phrase or word, such as `"physical measurements" analysis`.  The phrase was being split into words when it should have been.  This only impacted advanced search. ([#273](https://github.com/project-lux/lux-marklogic/issues/273))

### Security

## v1.22.0 - 2024-08-05

### Added

### Changed

- Changed exception handling for invalid search requests, enabling endpoints to conditionally process invalid search requests.  The `facets`, `searchEstimate`, and `searchWillMatch` endpoints now _log_ different messages when failing due to invalid search requests, enabling more targeted system monitoring alerts.  Other than the wording of some messages, there is no impact to endpoint consumers. ([#236](https://github.com/project-lux/lux-marklogic/issues/236))
- Search no longer calculates search result scores when sorting by an index ([#123](https://github.com/project-lux/lux-marklogic/issues/123)).
- Changed help text for \[Record Type\] Class advanced search fields to explain what each Class is ([#251](https://github.com/project-lux/lux-marklogic/issues/251)).
- Changed the "Occupation" field in Advanced Search to be called "Occupation/Role". Also updated the help text accordingly. ([#40](https://github.com/project-lux/lux-marklogic/issues/40)).

### Removed
 
### Fixed

### Security

- The default user on the request-group-1 and request-group-2 application servers is now explicitly set to `nobody` during deployment ([#252](https://github.com/project-lux/lux-marklogic/issues/252)).
- Replaced the `copyRestApiOptions` deployment task with `importRestApiOptions`.  The tenant's deployer role was unable to execute the `copyRestApiOptions` task but is able to execute the `importRestApiOptions` task ([#243](https://github.com/project-lux/lux-marklogic/issues/243)).

## v1.21.0 - 2024-07-22

### Added

 - Added the ability to switch from filtered to unfiltered results in the search, semantic facet, and related list contexts.  The default for each context is controlled by a dedicated build property: `filterSearchResults`, `filterSemanticFacetSearchResults`, and `filterRelatedListSearchResults`, respectively.  The initial intent is to continue filtering results by default.  The `search`, `facets`, and `relatedLists` endpoints now accept the `filterResults` parameter, which may be used to override the default or otherwise explicitly specify the filtering behavior. ([#223](https://github.com/project-lux/lux-marklogic/issues/223))
 - Added facets and advanced search configuration for agent's professional activity ([#156](https://github.com/project-lux/lux-marklogic/issues/156))

### Changed

 - Changed log messages for failed facet and search estimate requests when due to insufficient search criteria in order to prevent email alerts ([#236](https://github.com/project-lux/lux-marklogic/issues/236)).
 - Changed the People or Group advanced search option config to People or Group Class ([#201](https://github.com/project-lux/lux-marklogic/issues/201)).
 - Changed event used field to use a field index instead of triples - this doesn't change functionality, but keeps patterns used in the code consistent ([#217](https://github.com/project-lux/lux-marklogic/issues/217)).

### Removed
 
### Fixed
- Fixed Has Digital Image facet and advanced search field for Works - they now include Sets ([#52](https://github.com/project-lux/lux-marklogic/issues/52)).
- Fixed Work Class facet and advanced search field for Works - they now include Sets ([#222](https://github.com/project-lux/lux-marklogic/issues/222)).
- Added range indexes for AutoComplete fields without range indexes. AutoComplete is not used at the moment, but this ensures it is functional if that endpoint is consumed by the frontend / middle tier ([#198](https://github.com/project-lux/lux-marklogic/issues/198)).

### Security

- Changed security roles and how document permissions are set in support of tenants and unit portals.  Includes roles for YCBA, YPM, and YUAG.  For details, see [LUX Backend: Security and Software](/docs/lux-backend-security-and-software.md) and [LUX Backend: Importing Data](/docs/lux-backend-import-data.md).  (Security portion of [#73](https://github.com/project-lux/lux-marklogic/issues/73))

## v1.20.0 - 2024-07-08

### Added

### Changed
 - The REST API options of both application servers used by the middle tier are now identical ([#212](https://github.com/project-lux/lux-marklogic/issues/212)).
 - Error handler no longer masks the underlying error when `external.error` is undefined ([#207](https://github.com/project-lux/lux-marklogic/issues/207)).
 - Additional details will be logged for failed `searchEstimate` requests ([#183](https://github.com/project-lux/lux-marklogic/issues/183)).
 - Additional details will be logged for failed `searchWillMatch` requests ([#177](https://github.com/project-lux/lux-marklogic/issues/177)).
 - The `facets` endpoint now supports pagination.  Given maximum page lengths, it may be necessary to make multiple facet requests to retrieve the desired number of a facet's values.  The maximum page length varies by facet type (semantic vs. non-semantic).  One may also wish to override the default sort order, for non-semantic facets.  For details, please see the [`facets` endpoint documentation](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-backend-api-usage.md#facets). ([#160](https://github.com/project-lux/lux-marklogic/issues/160) and [#161](https://github.com/project-lux/lux-marklogic/issues/161))
 - Increased support for multi-tenant environments ([#149](https://github.com/project-lux/lux-marklogic/issues/149)).
 - Name search criteria now resolves against primary and alternative names within select contexts ([#100](https://github.com/project-lux/lux-marklogic/issues/100)):
     - Keyword search criteria resolves in related documents using primary and alternative reference names.
     - Less the `set` search scope, all `name` search terms resolve against their respective primary and alternative names.

### Removed
- Removed the `personRoles` endpoint. A data change made long ago resigned this endpoint to returning an empty array ([#203](https://github.com/project-lux/lux-marklogic/issues/203)).
- Moved the query plan viewer (developer tool) into its own ML Gradle project ([#192](https://github.com/project-lux/lux-marklogic/issues/192)).
- Removed obsolete depict-related configuration ([#190](https://github.com/project-lux/lux-marklogic/issues/190)).

### Fixed
- The event scope's `used` search term now works with an ID child field ([#186](https://github.com/project-lux/lux-marklogic/issues/186)).

### Security

## v1.19.0 - 2024-06-24

### Added
- Added facets and search terms for record types for Objects, Works, Concepts, and Events ([#138](https://github.com/project-lux/lux-marklogic/issues/138),[#139](https://github.com/project-lux/lux-marklogic/issues/139),[#140](https://github.com/project-lux/lux-marklogic/issues/140),[#141](https://github.com/project-lux/lux-marklogic/issues/141))
- Added search terms for creation/production influenced by an agent ([#65](https://github.com/project-lux/lux-marklogic/issues/65))

### Changed

### Removed

### Fixed

### Security

## v1.18.0 - 2024-06-10

### Added
 - Added build time data constant for 'collection' ([#167](https://github.com/project-lux/lux-marklogic/issues/167))

### Changed

### Removed

### Fixed

### Security

## v1.17.0 - 2024-05-28

### Added
- Added search term for works that are/are not in the public domain ([#103](https://github.com/project-lux/lux-marklogic/issues/103))

### Changed
- Changed indexes to use Getty AAT values instead of data constants ([#54](https://github.com/project-lux/lux-marklogic/issues/54))
### Removed

### Fixed

### Security

## v1.16.0 - 2024-05-14

### Added
- Added config file for modules database ([#124](https://github.com/project-lux/lux-marklogic/issues/124))
- Update member of / containing fields to remove duplicate and allow traversing hiearchical sets ([#135](https://github.com/project-lux/lux-marklogic/issues/135))
### Changed
  
### Removed

### Fixed

### Security

## v1.15.0 - 2024-04-29

### Added
- Added concept relatedToEvent related list ([#96](https://github.com/project-lux/lux-marklogic/issues/96))
- Added support to sort items by their archive sort values ([#90](https://github.com/project-lux/lux-marklogic/issues/90))
  
### Changed
- Changed logic for via search facets (Responsible Units contain departments or curate sets directly. Responsible Collections are collection sets.) ([#68](https://github.com/project-lux/lux-marklogic/issues/68))
  
### Removed

### Fixed

### Security

## v1.14.1 - 2024-04-18

### Added

### Changed
- Updated pipelineDataConstants.json for new dataset

### Removed

### Fixed

### Security

## v1.14.0 - 2024-04-15

### Added
- Added agent recordType (Person or Group) to the user facing config (so it shows up in advanced search) ([#75](https://github.com/project-lux/lux-marklogic/issues/75))
- Added relation names for agent relatedToEvent related list ([#67](https://github.com/project-lux/lux-marklogic/issues/67))
- Added place relatedToEvent related list ([#95](https://github.com/project-lux/lux-marklogic/issues/95))

### Changed

### Removed

### Fixed

### Security

## v1.13.0 - 2024-04-01

### Added

### Changed

### Removed

### Fixed
- Fixed the search scope specified throughout the search response body when the search request specifies the search scope using the search criteria's `_scope` property ([#81](https://github.com/project-lux/lux-marklogic/issues/81))

### Security

## v1.12.0 - 2024-03-18

### Added

### Changed
- Changed via search facets to order by number of results descending ([#57](https://github.com/project-lux/lux-marklogic/issues/57))

### Removed

### Fixed

### Security

## v1.11.0 - 2024-03-04

### Added

### Changed

### Removed

### Fixed
- Fixed incorrect ID URIs in Activity Streams responses ([#60](https://github.com/project-lux/lux-marklogic/issues/60))
### Security

## v1.10.1 - 2024-02-21
### Added

### Changed
- Cleaned up code for release to public repo ([#1095](https://git.yale.edu/lux-its/marklogic/issues/1095)).
- Updated documentation on setting up a local Marklogic envrionment ([#1071](https://git.yale.edu/lux-its/marklogic/issues/1071)).
### Removed

### Fixed

### Security

## v1.10.0 - 2024-02-20

### Added
- Added LICENSE.txt and NOTICE.txt ([#60](https://git.yale.edu/lux-its/lux-project/issues/60)).

### Changed
- Changed search estimate endpoint to accept scope as a query parameter ([#1161](https://git.yale.edu/lux-its/marklogic/issues/1161)).
- Changed Context link returned in Activity Streams endpoints to be correct (https://linked.art/ns/v1/search.json) ([#1120](https://git.yale.edu/lux-its/marklogic/issues/1120)).
- Changed facets and related list endpoints to use Activity Streams format ([#1164](https://git.yale.edu/lux-its/marklogic/issues/1164)).
### Removed
- Removed search estimates endpoint. It is replaced by multiple requests to the search estimate (singular) endpoint. ([#1118](https://git.yale.edu/lux-its/marklogic/issues/1118)).

### Fixed

### Security

## v1.9.0 - 2024-02-05

### Added
- Added a new data constant for visitor statements ([#1143](https://git.yale.edu/lux-its/marklogic/issues/1143)).

### Changed
- Updated data constants for 1/25 dataset ([#1150](https://git.yale.edu/lux-its/marklogic/issues/1150)).

### Removed

### Fixed

### Security

## v1.8.0 - 2024-01-19

### Added

### Changed
- Updated data constants for 1/13 dataset ([#1137](https://git.yale.edu/lux-its/marklogic/issues/1137)).

### Removed
- Removed cluster-formation directory and cluster-formation documentation, as it is migrating to a new repository ([#1130](https://git.yale.edu/lux-its/marklogic/issues/1130)).

### Fixed

### Security

## v1.7.1 - 2024-01-11

### Added

### Changed
- Reverted date search change ([#1032](https://git.yale.edu/lux-its/marklogic/issues/1032)).
### Removed

### Fixed

### Security

## v1.7.0 - 2024-01-09

### Added

### Changed
- Changed date search to use new JSON format ([#1032](https://git.yale.edu/lux-its/marklogic/issues/1032)).
### Removed

### Fixed

### Security

## v1.6.0 - 2023-12-11

### Added
- Added Search Estimate Endpoint (single estimate) which uses Activity Streams ([#1104](https://git.yale.edu/lux-its/marklogic/issues/1104)).
- Added Events To Agents Related List (agent relatedToEvent search term) ([#899](https://git.yale.edu/lux-its/marklogic/issues/899)).

### Changed
 - Changed Search Endpoint to use Activity Streams ([#1103](https://git.yale.edu/lux-its/marklogic/issues/1103)).
 - Changed Search Estimates Endpoint to to use Activity Streams ([#1105](https://git.yale.edu/lux-its/marklogic/issues/1105)).

### Removed

### Fixed
- fix typo in pagination error ([#1106](https://git.yale.edu/lux-its/marklogic/issues/1106)).

### Security

## v1.5.0 - 2023-11-13

### Added

### Changed
- Updated documentation to make navigation easier ([#1071](https://git.yale.edu/lux-its/marklogic/issues/1071)).
### Removed

### Fixed
- fix typo in pagination error ([#1106](https://git.yale.edu/lux-its/marklogic/issues/1106)).

### Security

## v1.4.0 - 2023-08-30

### Added

### Changed
- Changed advanced search labels to all use plural verbs - e.g. 'Have Digital Image' instead of 'Has Digital Image'  ([#1085](https://git.yale.edu/lux-its/marklogic/issues/1085)).

### Removed

### Fixed

### Security

## v1.3.0 - 2023-07-24

### Added
- Add New Data Constants For Copyright Licensing Statements, First, and Specimens ([#1064](https://git.yale.edu/lux-its/marklogic/issues/1064)).

### Changed

### Removed
 - Delete indexes associated to the deleted depictedBy and depicted[Scope] search terms ([#934](https://git.yale.edu/lux-its/marklogic/issues/934)).
 - Drop the any search terms and the *AnyId indexing configuration ([#812](https://git.yale.edu/lux-its/marklogic/issues/812)).
 - Drop event 'hasDigitalImage' search terms and indexing configuration ([#777](https://git.yale.edu/lux-its/marklogic/issues/777)).

### Fixed

### Security

## v1.2.0 - 2023-07-10

### Added

 - Enable faceting by agent record type (Person vs Group) ([#1011](https://git.yale.edu/lux-its/marklogic/issues/1011)).
 - Add new item profile 'rights' for getting rights information from works ([#1059](https://git.yale.edu/lux-its/marklogic/issues/1059)).

### Changed

### Removed

### Fixed

### Security

## v1.1.0 - 2023-06-28

### Added

### Changed
 - Increased the maximum page length from 20 to 100 for search, while keeping the default at 20 ([#1035](https://git.yale.edu/lux-its/marklogic/issues/1035)).

### Removed
- Removed event's hasDigitalImage facet as events never have digital images ([#1037](https://git.yale.edu/lux-its/marklogic/issues/1037)).

### Fixed

### Security

## v1.0.2 - 2023-06-14

### Added

- Added the search request ID to the request log ([#997](https://git.yale.edu/lux-its/marklogic/issues/997)).

### Changed

- Changed the default request timeout from 59 seconds to 20 seconds.
- Changed simple search to no longer treat `NEAR` as a search operator ([#974](https://git.yale.edu/lux-its/marklogic/issues/974)).
- Changed the database index configuration generation script to no longer include field-level properties when those values match the database-level defaults ([#904](https://git.yale.edu/lux-its/marklogic/issues/904)).

### Removed

- Removed obsolete IRI code from the facets library ([#1012](https://git.yale.edu/lux-its/marklogic/issues/1012)).

### Fixed

- Fixed search parsing error messages that were being suppressed ([#1016](https://git.yale.edu/lux-its/marklogic/issues/1016)).

### Security

## Mid-Release Configuration Change - 2023-06-02

Increased the default request timeout from 20 seconds to 59 seconds.

## Mid-Release Configuration Change - 2023-05-26

Reduced the maximum number of concurrent threads on the `lux` application server (port 8003) from 32 to 24 ([#920](https://git.yale.edu/lux-its/marklogic/issues/920)).

## v1.0.1 - 2023-05-22

### Added

- Added visual items to the work about indexes ([#961](https://git.yale.edu/lux-its/marklogic/issues/961)).
- Added a sort binding for sorting by relevance ([#960](https://git.yale.edu/lux-its/marklogic/issues/960)).

### Changed

- Changed the URI of several examples within the advanced search help text ([#1004](https://git.yale.edu/lux-its/marklogic/issues/1004)).
- Changed the advanced search term labels from being singular to plural ([#975](https://git.yale.edu/lux-its/marklogic/issues/975)).

### Removed

### Fixed

### Security

## v1.0.0 - 2023-05-10

### Added

### Changed

- Changed the search endpoint to only estimate the requested search scope ([#953](https://git.yale.edu/lux-its/marklogic/issues/953)).
- Changed facet calculation to by faster by using `.toArray` ([#952](https://git.yale.edu/lux-its/marklogic/issues/952)).
- Changed search to use `cts.falseQuery` for ignored criteria ([#950](https://git.yale.edu/lux-its/marklogic/issues/950)).
- Changed advanced search help text to indicate `has All of`, `has Any of`, and `has None of` are the advanced search equivalents of simple search's `AND`, `OR`, and `-` operators ([#946](https://git.yale.edu/lux-its/marklogic/issues/946)).

### Removed

### Fixed

### Security

---

_For changes that predate v1.0.0 or for non-runtime tickets, please search for closed tickets with or without a version label. For example, there were over two dozen  [Backend v1.0.1 tickets](https://git.yale.edu/lux-its/marklogic/issues?q=is%3Aissue+label%3Av1.0.1+is%3Aclosed)._
