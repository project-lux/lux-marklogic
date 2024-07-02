# Changelog

All changes to the MarkLogic (backend) portion of LUX capable of impacting the runtime experience will be documented in this file.  These are to include software, configuration, and environment changes.

## Unreleased

### Added

### Changed
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
