## **LUX Backend API Usage**

- [Introduction](#introduction)
- [Security](#security)
- [Generated Data Service Interfaces](#generated-data-service-interfaces)
- [Custom MarkLogic Data Services](#custom-marklogic-data-services)
  - [Advanced Search Configuration](#advanced-search-configuration)
    - [Successful Request / Response Example](#successful-request--response-example)
    - [Failed Request / Response Example](#failed-request--response-example)
  - [Auto Complete](#auto-complete)
    - [Implementation Notes](#implementation-notes)
    - [Successful Request / Response Example](#successful-request--response-example-1)
    - [Failed Request / Response Example](#failed-request--response-example-1)
  - [Data Constants](#data-constants)
    - [Successful Request / Response Example](#successful-request--response-example-2)
    - [Failed Request / Response Example](#failed-request--response-example-2)
  - [Document](#document)
    - [Successful Request / Response Example](#successful-request--response-example-3)
    - [Failed Request / Response Example](#failed-request--response-example-3)
  - [Facets](#facets)
    - [Successful Request / Response Example](#successful-request--response-example-4)
    - [Failed Request / Response Example](#failed-request--response-example-4)
  - [Related List](#related-list)
    - [Successful Request / Response Example](#successful-request--response-example-5)
    - [Failed Request / Response Example](#failed-request--response-example-5)
  - [Search](#search)
    - [Successful Request / Response Example](#successful-request--response-example-6)
    - [Failed Request / Response Example](#failed-request--response-example-6)
  - [Search Estimate](#search-estimate)
    - [Successful Request / Response Example](#successful-request--response-example-7)
    - [Failed Request / Response Example](#failed-request--response-example-7)
  - [Search Will Match](#search-will-match)
    - [Successful Request / Response Example](#successful-request--response-example-8)
    - [Failed Request / Response Example](#failed-request--response-example-8)
  - [Search Info](#search-info)
    - [Successful Request / Response Example](#successful-request--response-example-9)
    - [Failed Request / Response Example](#failed-request--response-example-9)
  - [Stats](#stats)
    - [Successful Request / Response Example](#successful-request--response-example-10)
    - [Failed Request / Response Example](#failed-request--response-example-10)
  - [Translate](#translate)
    - [Successful Request / Response Example](#successful-request--response-example-11)
    - [Failed Request / Response Example](#failed-request--response-example-11)

# Introduction

The LUX platform's custom backend API is presently implemented as a set of MarkLogic Data Services, all of which are to be documented herein.  The source code may be found within [/src/main/ml-modules/root/ds](/src/main/ml-modules/root/ds).

Where applicable these endpoints return JSON API responses which are based upon the [Linked Art Search Response Format](https://linked.art/api/1.0/ecosystem/search/), which itself is based upon the Collections model from [Activity Streams](https://www.w3.org/TR/activitystreams-core/#collections).

It is possible that LUX backend consumers also consume MarkLogic native endpoints; for those, please see [MarkLogic's REST API reference](https://docs.marklogic.com/REST) and [MarkLogic's REST API Developer's Guide](https://docs.marklogic.com/guide/rest-dev).

# Security

Every LUX backend endpoint request must be authenticated.  Approved LUX backend API consumers are intended to have the tenant's endpoint consumer role ([%%mlAppName%%-endpoint-consumer](/src/main/ml-config/base/security/roles/2-tenant-endpoint-consumer-role.json)), which will provide the consumer sufficient privilege to consume all of LUX's backend endpoints.

Use DIGEST for HTTP application servers and BASIC for HTTPS application servers.

# Generated Data Service Interfaces

Node.js and Java interfaces may be generated from MarkLogic Data Services.  LUX's middle tier uses Node.js and the associated data service generated interfaces/proxies.  Below is a short description of the various pieces required to generate the interfaces.  See the middle tier's documentation for more information, such as when to generate the interfaces during that tier's deployment.

1. gulpfile.js exports a function that executes MarkLogic's proxy generator.  Therein, one specifies where to find the project's MarkLogic Data Service definition files and where to output the generated interfaces.
2. package.json needs to list `marklogic` package as a dependency and `gulp` as a dev dependency.
3. Once those packages are installed, run `gulp proxygen`.
4. Node.js code may now use the generated interfaces.

Usage example that presumes an Express.JS context:

```javascript
const router = express.Router();

const mlApi = require('../utils/mlApi.js');
const client = new mlApi().getMarkLogicClient();

const Lux = require('../lib/lux.js');
const luxInstance = Lux.on(client);

router.get(
  '/api/document',
  passport.authenticate('jwt-user', {
    session: false,
  }),
  function (req, res, next) {
    luxInstance
	  .item(req.query.uri, req.query.profile, req.query.lang)
	  .then((doc) => {
	    res.send(doc);
	  })
	  .catch((e) => {
	    errors.handleError(req, res, e);
	  });
  }
);

module.exports = router;
```

More:

* Middle tier's package.json defines the version of the MarkLogic Node.js module it uses.
* MarkLogic Node.js module in npm repo: https://www.npmjs.com/package/marklogic
* MarkLogic Node.js module source repo: https://github.com/marklogic/node-client-api
* MarkLogic Node.js Client API documentation: https://docs.marklogic.com/jsdoc/index.html
* MarkLogic Node.js Application Developer's Guide: https://docs.marklogic.com/guide/node-dev
* Like Java better?  Check out https://docs.marklogic.com/guide/java/DataServices

*Note to backend endpoint developers: generated Data Service interfaces do not play nicely with hyphens in the Data Service file names.  Use camelCase instead.*

# Custom MarkLogic Data Services

## Advanced Search Configuration

The `advancedSearchConfig` endpoint enables consumers to get a typescript-formatted version of the search configuration geared towards an advanced search user interface.

**URL** : `/ds/lux/advancedSearchConfig.mjs`

**Method(s)** : `GET`, `POST`

**Endpoint Parameters** : None

### Successful Request / Response Example

Scenario: Retrieve and request the advanced search configuration.

Parameters: None

Response Status Code: 200

Response Status Message: OK

Response Body:

*Abbreviated content shown below.*

```
{
   "terms":{
      "agent":{
         "name":{
            "label":"Name",
            "helpText":"Enter term(s) to be found within the title or name of...",
            "relation":"text",
            "allowedOptionsName":"keyword",
            "defaultOptionsName":"keyword"
         },
         "text":{
            "label":"Anywhere",
            "helpText":"Search for People & Groups by terms anywhere in the...",
            "relation":"text",
            "allowedOptionsName":"keyword",
            "defaultOptionsName":"keyword"
         },
         "startAt":{
            "label":"Born/Formed At",
            "helpText":"Search for People & Groups that were born or formed in...",
            "relation":"place",
            "autoCompleteContext":"agent.startAt",
            "allowedOptionsName":"keyword",
            "defaultOptionsName":"keyword"
         },
         ...more search terms.
      },
      ...more search scopes.
   },
   "options":{
      "keyword":{
         "allowed":[
            "case-sensitive",
            "case-insensitive",
            "diacritic-sensitive",
            ...more allowed options.
         ],
         ...defaults for this group.
      },
      ...at least one more group.
   }
}
```

### Failed Request / Response Example

*Only known scenarios would be an authentication error and internal server error.*

## Auto Complete

*Experimental endpoint. Not yet fully vetted or used in LUX production.*

The `autoComplete` endpoint allows consumers to request primary and alternative names that include wildcarded input.

In the context of servicing a single user typing in a field, endpoint consumers are advised to wait for their previous request's response before making a new request, even if doing so imposes a lag on displaying the most relevant matches for the user's latest input.

**URL** : `/ds/lux/autoComplete.mjs`

**Method(s)** : `GET`, `POST`

**Endpoint Parameters**

| Parameter | Example | Description |
|-----------|---------|-------------|
| `text` | `'kra'` | **REQUIRED** - The text to match on.  May be one or more words.  Matches are **in**sensitive to case, diacritics, punctuation, and whitespace; further non-wildcarded words may be stemmed.  An asterisk is automatically added to the end of the text (last word).  Additional wildcards may be included.  Use an asterisk for zero or more of any character.  Use *one* question mark for *each* single character that can be any character.  Start the text with an asterisk to indicate it may be anywhere in the name, as opposed to having to start with it.  Duplicate wildcard characters are automatically consolidated.  Contiguous question marks are not consider duplicate, and thus not consolidated.  As an example, the system would change `hamp?* hea?? loo` to `hamp* hea?? loo*`, which could return `Hampstead Heath Looking Towards Harrow`.  The `metadata.matchOn` response body property value is the cleaned up value.  An error is thrown when a wildcarded word does not include three contiguous non-wildcard characters; i.e., one- and two-character wildcard matches are not supported.  |
| `context` | `'item.material'` | **REQUIRED** - The context to resolve the `text` parameter value in. The context is the search scope and search term names combined as "`[scopeName].[termName]`".  For example, the context parameter value for search scope "agent" and search term "activeAt" would be "agent.activeAt".  For a list of available contexts, please see [/src/main/ml-modules/root/config/autoCompleteConfig.mjs](/src/main/ml-modules/root/config/autoCompleteConfig.mjs).  The advanced search configuration also offers `getAutoCompleteContext(scopeName: string, termName: string)`.  An error is thrown if an unsupported value is specified. |
| `fullyHonorContext` | `false` | **OPTIONAL** - Each auto complete context is configured with two constraints: a list of names and a relationship.  For example, the `itemProductionAgentId` context is configured to agent names and requires the agent have produced something.  When this parameter value is `true`, both constraints are applied.  When `false`, the relationship constraint is not applied --faster but will include false positives.  Some of the other parameters only apply when this parameter value is `true`.  Defaults to `true`. |
| `onlyMatchOnPrimaryNames` | `false` | **OPTIONAL** - When `true`, the list of names to match on is restricted to primary names.  When `false`, the list of names includes both primary and alternative names.  Defaults to `true`. |
| `onlyReturnPrimaryNames` | `true` | **OPTIONAL** - Primary names are always included in the response, as the `primaryNames` property value, within the `matches` array.  Some of those names may not match the text --but at least one in the associated document did.  Depending on the value of the `onlyMatchOnPrimaryNames` parameter, a document could have been included that only matched on an alternative now.  When `onlyReturnPrimaryNames` is `false`, the `matchingNames` property is also included for each match and contains the names that matched the text.  The `matchingNames` property value can include alternative names when `onlyMatchOnPrimaryNames` is `false`.  `onlyReturnPrimaryNames` defaults to `false`.  This parameter is presently only used when `fullyHonorContext` is `true`. |
| `page` | `1` | **OPTIONAL** - The starting "page" or index in the list of matches. Defaults to 1. An error will be thrown if this value is less than 1. |
| `pageLength` | `7` | **OPTIONAL** - The number of matches to return. Default and maximum: 10. An error will be thrown if this value is less than 1. |
| `filterIndex` | `63` | **OPTIONAL** - Useful when requesting the next page of matches when none of the above parameter values need to change.  It instructs the backend where to resume looking in the list of names so as not to include ones already returned or skip over others.  Use the value given in the `metadata.filterIndex` response body property from the previous request.  Defaults to `0`.  This parameter is presently only used when `fullyHonorContext` is `true`. |
| `previouslyFiltered` | `1223` | **OPTIONAL** - Useful when requesting the next page of matches as it informs the backend how many candidate matches had to be filtered before either qualifying a page worth's of results or timing out.  Defaults to `0`.  This parameter is presently only used when `fullyHonorContext` is `true`. |
| `timeoutInMilliseconds` | `500` | **OPTIONAL** - The number of milliseconds before time out.  Clock begins once in the endpoint's implementation.  Defaults to `0` which is interpreted as no timeout.  The `metadata.timedOut` response body property indicates if the request timed out or not.  This parameter is presently only used when `fullyHonorContext` is `true`. |

### Implementation Notes

Implementation choices and restrictions combined with the dataset and certain parameter values could lead to some discrepancies:

1. For performance reasons, candidate names are not filtered by underlying capabilities, leading to the potential of false positives.  For instance, if the consumer specifies `'ben'` as the text to match, qualifying documents _should_ have at least one name that begins with "ben"; however, the system may include results with "ben" anywhere in one of the names.  There is an option to improve this without accepting the full performance penalty.
2. Due to a difference in supported options between two native functions, the `matchingNames` property value may omit some names that matched the input.  This may be expected when the system had to ignore punctuation or whitespace in order to make the match.  Stemmed words may also be a factor.

### Successful Request / Response Example

Scenario: Request the first ten matches of people and group names that begin with "ben".  Receive the first three matches due to reaching the specified timeout.

Parameters:

| Parameter | Value |
|-----------|-------|
| `text` | `'smith'` |
| `context` | `'item.producedBy'` |
| `fullyHonorContext` | `true` |
| `onlyMatchOnPrimaryNames` | `false` |
| `onlyReturnPrimaryNames` | `false` |
| `page` | `1` |
| `pageLength` | `10` |
| `timeoutInMilliseconds` | `500` |

Response Status Code: 200

Response Status Message: OK

Response Body:

*Abbreviated content shown below.*

```
{
  "matches":[
    {
      "uri":"https://lux.collections.yale.edu/data/person/6384e2e3-f682-494a-a7a7-942bb26a703d",
      "primaryNames":[
        "Tony I Smith",
        "Tony Smith",
        "Tony. Smith",
        "توني سميث",
        "トニー・スミス",
        "托尼·史密斯"
      ],
      "matchingNames":[
        "Smith, Anthony",
        "Smith, Anthony Peter",
        "Smith, Tony",
        "Smith, Tony (American sculptor, architect, and painter, 1912-1980)",
        "Smith, Tony I",
        "Smith, Tony Peter",
        "Smith, Tony, 1912-",
        "Smith, Tony, 1912-1980",
        "Smith, Tony."
      ]
    },
    {
      "uri":"https://lux.collections.yale.edu/data/person/fd24d1e8-7679-43ae-81af-4cd82ad961b7",
      "primaryNames":[
        "Henry Holmes Smith",
        "Smith, Henry Holmes",
        "هنري هولمز سميث",
        "ヘンリー・ホームズ・スミス"
      ],
      "matchingNames":[
        "Smith, Henry Holmes",
        "Smith, Henry Holmes (American photographer, 1909-1986)",
        "Smith, Henry Holmes, 1909-1986"
      ]
    },
    ...more matches
  ],
  "metadata":{
    "milliseconds":500,
    "returned":9,
    "fullyHonorContext":true,
    "matchOn":"smith*",
    "onlyMatchOnPrimaryNames":false,
    "onlyReturnPrimaryNames":false,
    "fieldForNamesToReturn":"agentPrimaryName",
    "fieldForMatchingNames":"agentName",
    "fieldForId":[
      "itemProductionAgentId"
    ],
    "page":1,
    "pageLength":10,
    "filterIndex":481,
    "previouslyFiltered":0,
    "timeoutInMilliseconds":500,
    "timedOut":true,
    "filteredCount":481
  }
}
```

### Failed Request / Response Example

Scenario: Insufficient number of characters.

Parameters:

| Parameter | Value |
|-----------|-------|
| `text` | `'be'` |
| `context` | `'agent.activeAt'` |

Response Status Code: 400

Response Status Message: "Wildcarded strings must have at least three non-wildcard characters before or after the wildcard; 'be*' does not qualify"

```
{
  "errorResponse":{
    "statusCode":400,
    "status":"Bad Request",
    "messageCode":"BadRequestError",
    "message":"Wildcarded strings must have at least three non-wildcard characters before or after the wildcard; 'be*' does not qualify"
  }
}
```

## Data Constants

The `dataConstants` endpoint enables consumers to get all data constants available at that moment.

**Data constant values may vary between dataset versions.**  Data constants are only guaranteed constant within a single dataset version.  As such backend endpoint consumers are strongly encouraged not to hardcode these values within their application.  Rather, hardcode the data constant names and use this endpoint to retrieve the values for the dataset version present in the target environment.

**URL** : `/ds/lux/dataConstants.mjs`

**Method(s)** : `GET`, `POST`

**Endpoint Parameters** : None

### Successful Request / Response Example

Scenario: dataConstants returns some results.

Parameters: None

Response Status Code: 200

Response Status Message: OK

Response Body:

*Abbreviated content shown below.*

```
{
  "accessStatement":"https://lux.collections.yale.edu/data/concept/03f4eb19-0611-4f31-8e09-fc111c52f898",
  "active":"https://lux.collections.yale.edu/data/concept/11c48705-1114-49aa-8896-c7490678b608",
  "alternateName":"https://lux.collections.yale.edu/data/concept/c99c4343-b769-4a81-9f28-6aec5d281251",
  "alternateTitle":"https://lux.collections.yale.edu/data/concept/1ea34972-1a4f-46b3-bd69-e4b2c57950b5",
  "animalSpecimens":"https://lux.collections.yale.edu/data/concept/5f857a13-add4-4c25-ae8b-019975e75bcd",
  "archive":"https://lux.collections.yale.edu/data/concept/24a671f3-e269-4ad9-9710-4796b8cc9478",
  "biographyStatement":"https://lux.collections.yale.edu/data/concept/54e35d81-9548-4b4e-8973-de02b09bf9da",
  "biologicalSpecimens":"https://lux.collections.yale.edu/data/concept/676b56e6-2f8a-47fd-af1a-e5edc560cdb7",
  "citationsStatement":"https://lux.collections.yale.edu/data/concept/ceef9d2e-1a07-4269-827f-8c407e4d4711",
  "collection":"https://lux.collections.yale.edu/data/concept/74296593-a7da-4f42-ae7b-327a0b6bdd6a",
  "collectionItem":"https://lux.collections.yale.edu/data/concept/b34ad31c-4a2f-4cef-aee3-ae8d824e42a2",
  "copyrightLicensingStatement":"https://lux.collections.yale.edu/data/concept/4030679e-c6e0-4e5e-b3c0-48ee1b8cfe60",
  "countagentActivePlaceId":10584,
  ...more count constants
  "creditLineStatement":"https://lux.collections.yale.edu/data/concept/7c0ba119-47cb-4ade-8aa3-32a1e66c8ca9",
  "curatorship":"https://lux.collections.yale.edu/data/concept/6704dc8a-6e72-4282-a50d-1c8ea575ad8f",
  "department":"https://lux.collections.yale.edu/data/concept/7f59ed0b-0231-4784-ad5a-ffcff08cc277",
  "depth":"https://lux.collections.yale.edu/data/concept/37872594-97d9-4338-962b-d31f4bced440",
  "depthConcept":"https://lux.collections.yale.edu/data/concept/37872594-97d9-4338-962b-d31f4bced440",
  "descriptionStatement":"https://lux.collections.yale.edu/data/concept/b9d84f17-662e-46ef-ab8b-7499717f8337",
  "dimensionStatement":"https://lux.collections.yale.edu/data/concept/53922f57-dab5-43c5-a527-fc20a63fe128",
  "displayName":"https://lux.collections.yale.edu/data/concept/5088ec29-065b-4c66-b49e-e61d3c8f3717",
  "exhibition":"https://lux.collections.yale.edu/data/concept/88af90e3-d194-4bfb-aa8c-0998cdf7e679",
  "female":"https://lux.collections.yale.edu/data/concept/a309a746-9e51-4c34-b207-7f4773d2ac1a",
  "first":"https://lux.collections.yale.edu/data/concept/6eee749b-8038-4d26-b184-68321ea4fe91",
  "fossil":"https://lux.collections.yale.edu/data/concept/05a41429-8a18-4911-854e-eae804b7d46f",
  "gender":"https://lux.collections.yale.edu/data/concept/84ed0c0e-2aa8-49b3-ae02-ed84552f570d",
  "height":"https://lux.collections.yale.edu/data/concept/32c99593-6526-4cd4-98c7-71e5ccfcafc8",
  "heightConcept":"https://lux.collections.yale.edu/data/concept/32c99593-6526-4cd4-98c7-71e5ccfcafc8",
  "imprintStatement":"https://lux.collections.yale.edu/data/concept/e29bcdc8-e35d-4a6d-a7ae-fd3702611fb8",
  "intersexual":"https://lux.collections.yale.edu/data/concept/3e2f0b8f-e5c0-4b24-805c-2dde5cca71ee",
  "langaa":"https://lux.collections.yale.edu/data/concept/a92f7b18-48d4-4fdc-8b65-6413a0fc8d10",
  ...many more language constants
  "male":"https://lux.collections.yale.edu/data/concept/6f652917-4c07-4d51-8209-fcdd4f285343",
  "materialsStatement":"https://lux.collections.yale.edu/data/concept/a51a170c-211c-4cc1-bb11-52e24836117f",
  "nationality":"https://lux.collections.yale.edu/data/concept/05344568-bdd1-4289-90d6-b9fdcdbaaa4c",
  "occupation":"https://lux.collections.yale.edu/data/concept/86be41f5-60e4-47f4-bd4e-95a4955a3e9b",
  "officialName":"https://lux.collections.yale.edu/data/concept/8209ea47-ab8b-4e9c-9802-d043f6d7cced",
  "plantSpecimens":"https://lux.collections.yale.edu/data/concept/47ab8e09-e39c-46f1-b140-bdcabfbf2e1e",
  "primaryName":"https://lux.collections.yale.edu/data/concept/f7ef5bb4-e7fb-443d-9c6b-371a23e717ec",
  "provenanceStatement":"https://lux.collections.yale.edu/data/concept/dd8b8c75-3f4b-4071-a231-161ae556e572",
  "sortName":"https://lux.collections.yale.edu/data/concept/31497b4e-24ad-47fe-88ad-af2007d7fb5a",
  "statementType":"https://lux.collections.yale.edu/data/concept/b079998d-bb47-470a-ad7d-d938bd091f8a",
  "style":"https://lux.collections.yale.edu/data/concept/532cd8db-d99f-4013-9980-26ddc156d5ad",
  "translatedTitle":"https://lux.collections.yale.edu/data/concept/42e23e1e-c630-4ebd-aab0-f36a42f63170",
  "typeOfPart":"https://lux.collections.yale.edu/data/concept/861dda5d-03c4-44d6-a2a0-d699a3c7a791",
  "typeOfWork":"https://lux.collections.yale.edu/data/concept/4ea65dc4-76bc-45b7-b54c-a1ca4783d4e2",
  "visitors":"https://lux.collections.yale.edu/data/concept/d97f2e4a-1549-4c4b-9a27-bcf41a2b4972",
  "webPage":"https://lux.collections.yale.edu/data/concept/2eca07bd-be42-4ef5-9ec5-87c1bbfe639d",
  "width":"https://lux.collections.yale.edu/data/concept/5ce44eb3-a686-4315-961e-07db59b8c887",
  "widthConcept":"https://lux.collections.yale.edu/data/concept/5ce44eb3-a686-4315-961e-07db59b8c887"
}
```

### Failed Request / Response Example

*Only known scenarios would be an authentication error and internal server error.*

## Document

The `document` endpoint enables consumers to retrieve a single document's JSON-LD, or subset thereof upon specifying a named profile.

**URL** : `/ds/lux/document.mjs`

**Method(s)** : `GET`, `POST`

**Endpoint Parameters**

| Parameter | Example | Description |
|-----------|---------|-------------|
| `uri` | *See example below* | **REQUIRED** - The URI of the requested document. |
| `profile` | "relationship" | **OPTIONAL** - The name of a profile that informs which subset of the JSON-LD to return. The default is to serve up the entire JSON-LD block, which is also the behavior when an invalid profile name is specified or an exception is encountered. Available profiles: "name", "location", "relationship", "results"\*, and "rights"; one may double check in the `applyProfile()` function within [/src/main/ml-modules/root/lib/profileDocLib.mjs](/src/main/ml-modules/root/lib/profileDocLib.mjs). |
| `lang` | "en" | **OPTIONAL** - The language to serve up when there are multiple to choose from. Default is `en`. |

\* _Until the "results" profile's implementation is updated, the profile will return the entire JSON-LD block.  Nonetheless, present-day use of this profile within a search results context is encouraged._

### Successful Request / Response Example

Scenario: The name profile is requested of an existing document.

Parameters:

| Parameter | Value |
|-----------|-------|
| `uri` | `https://lux.collections.yale.edu/data/person/783e7e6f-6863-4978-8aa3-9e6cd8cd8e83` |
| `profile` | `name` |

Response Status Code: 200

Response Status Message: OK

Response Body:

```
{
   "id":"https://lux.collections.yale.edu/data/person/34f4eec7-7a03-49c8-b1be-976c2f6ba6ba",
   "type":"Person",
   "identified_by":[
      {
         "type":"Name",
         "content":"Andy Warhol",
         "language":[
            {
               "id":"https://lux.collections.yale.edu/data/concept/1fda962d-1edc-4fd7-bfa9-0c10e3153449",
               "type":"Language",
               "_label":"English"
            },
            ...more languages
         ],
         "classified_as":[
            {
               "id":"https://lux.collections.yale.edu/data/concept/f7ef5bb4-e7fb-443d-9c6b-371a23e717ec",
               "type":"Type",
               "_label":"Primary Name"
            }
         ]
      }
   ]
}
```

### Failed Request / Response Example

Scenario: Requested document does not exist.

Parameters:

| Parameter | Value |
|-----------|-------|
| `uri` | `https://lux.collections.yale.edu/data/person/4643c7bd-7189-4958-8e80-c5bd0d2a3397` |

Response Status Code: 404

Response Status Message: "Not Found"

Response Body:
```
{
  "errorResponse":{
    "statusCode":404,
    "status":"Not Found",
    "messageCode":"NotFoundError",
    "message":"Document 'https://lux.collections.yale.edu/data/person/4643c7bd-7189-4958-8e80-c5bd0d2a3397' Not Found"
  }
}
```

## Facets

The `facets` endpoint enables consumers to request a facet's values constrained by search criteria.

Facet values are not paginated.

If unable to calculate the facet, an error is thrown. This includes when the system determines the request would exceed a threshold configured by the `facetMaximumProduct` build property.  When that property value is less than the estimated number of search results multiplied by the sum of each requested facet's indexed values, the threshold is exceeded and an error is thrown.  When the `LuxFacet` trace event is enabled, a message is also logged.

**URL** : `/ds/lux/facets.mjs`

**Method(s)** : `GET`, `POST`

**Endpoint Parameters**

| Parameter | Example | Description |
|-----------|---------|-------------|
| `name` | `agentStartDate` | **REQUIRED** - The name of the facet to calculate.  The [Search Info endpoint's](#search-info) `facetBy` response body property lists all of the available facets. |
| `q` | *See [Search's example](#successful-request--response-example-7)* | **REQUIRED** - The query to constrain the facet's values by.  This parameter's support is identical to the [Search endpoint's](#search) `q` parameter. |
| `scope` | `agent` | **CONDITIONALLY REQUIRED** - The scope to apply to the query.  Only required when a) using the LUX String Search Grammar or b) using the LUX JSON Search Grammar but not setting the `_scope` property. The value of the `scope` parameter is given precedence over the LUX JSON Search Grammar `_scope` property value. For a complete list of available search scopes, please review the return of the [Search Info endpoint](#search-info), specifically the `searchBy` response body property. |

### Successful Request / Response Example

Scenario: Get the places where works associated to "mona lisa" were created.

Parameters:

| Parameter | Value |
|-----------|-------|
| `name` | `workCreationPlaceId` |
| `q` | `mona lisa` |
| `scope` | `work` |

Response Status Code: 200

Response Status Message: OK

Response Body:

*Abbreviated content shown below.*

```
{
   "@context":"https://linked.art/ns/v1/search.json",
   "id":"https://lux.collections.yale.edu/api/facets/work?q=%7B%22AND%22%3A%5B%7B%22text%22%3A%22mona%22%2C%22_lang%22%3A%22en%22%7D%2C%7B%22text%22%3A%22lisa%22%2C%22_lang%22%3A%22en%22%7D%5D%7D&name=workCreationPlaceId",
   "type":"OrderedCollectionPage",
   "orderedItems":[
      {
         "id":"https://lux.collections.yale.edu/api/search-estimate/work?q=%7B%22AND%22%3A%5B%7B%22AND%22%3A%5B%7B%22text%22%3A%22mona%22%2C%22_lang%22%3A%22en%22%7D%2C%7B%22text%22%3A%22lisa%22%2C%22_lang%22%3A%22en%22%7D%5D%7D%2C%7B%22createdAt%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fplace%2F58a57603-f224-4cc7-ab41-f08876619e23%22%7D%7D%5D%7D",
         "type":"OrderedCollection",
         "totalItems":9,
         "first":{
            "id":"https://lux.collections.yale.edu/api/search/work?q=%7B%22AND%22%3A%5B%7B%22AND%22%3A%5B%7B%22text%22%3A%22mona%22%2C%22_lang%22%3A%22en%22%7D%2C%7B%22text%22%3A%22lisa%22%2C%22_lang%22%3A%22en%22%7D%5D%7D%2C%7B%22createdAt%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fplace%2F58a57603-f224-4cc7-ab41-f08876619e23%22%7D%7D%5D%7D",
            "type":"OrderedCollectionPage"
         },
         "value":"https://lux.collections.yale.edu/data/place/58a57603-f224-4cc7-ab41-f08876619e23"
      },
      {
         "id":"https://lux.collections.yale.edu/api/search-estimate/work?q=%7B%22AND%22%3A%5B%7B%22AND%22%3A%5B%7B%22text%22%3A%22mona%22%2C%22_lang%22%3A%22en%22%7D%2C%7B%22text%22%3A%22lisa%22%2C%22_lang%22%3A%22en%22%7D%5D%7D%2C%7B%22createdAt%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fplace%2Fbf7dca12-9002-4055-92d0-31f1fae1fe76%22%7D%7D%5D%7D",
         "type":"OrderedCollection",
         "totalItems":5,
         "first":{
            "id":"https://lux.collections.yale.edu/api/search/work?q=%7B%22AND%22%3A%5B%7B%22AND%22%3A%5B%7B%22text%22%3A%22mona%22%2C%22_lang%22%3A%22en%22%7D%2C%7B%22text%22%3A%22lisa%22%2C%22_lang%22%3A%22en%22%7D%5D%7D%2C%7B%22createdAt%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fplace%2Fbf7dca12-9002-4055-92d0-31f1fae1fe76%22%7D%7D%5D%7D",
            "type":"OrderedCollectionPage"
         },
         "value":"https://lux.collections.yale.edu/data/place/bf7dca12-9002-4055-92d0-31f1fae1fe76"
      },
      ...more facet values
   ]
}
```

### Failed Request / Response Example

Scenario: Request exceeds threshold of estimated number of search results multiplied by the number of the facet's indexed values.

Parameters:

| Parameter | Value |
|-----------|-------|
| `name` | `workCreationAgentId` |
| `q` | `book` |
| `scope` | `work` |

Response Status Code: 400

Response Status Message: Bad Request

Response Body:

```
{
  "errorResponse": {
    "statusCode": 400,
    "status": "Bad Request",
    "messageCode": "BadRequestError",
    "message": "Threshold to calculate the 'workCreationAgentId' facet exceeded."
  }
}
```

*When the `LuxFacet` trace event is enabled, a message similar to the following will also be logged: "Rejected request to calculate the 'workCreationAgentId' facet as 11,212,278 search results by 4,924,830 field values exceeds the 5,000,000,000,000 threshold."*

## Related List

The `relatedList` endpoint may be used to retrieve a set of items related to the specified document.  Each item identifies:

1. The related document's URI.
2. The name of the relationship.
3. The number of times this specific relationship (e.g., created by) is defined for the two documents.
4. A search-estimate and search link illustrating the relationship (e.g., all works created by Sanderson and published in New Haven, CT).  

The same document will span multiple entries when the documents are related in multiple unique relationships (e.g., created and published by).  When this happens, all entries for the same related document are contiguous.

Items are sorted by the total number of relationships between the two documents, from most to least.

**Performance tip:** in paginated contexts, implement local pagination and request items for multiple pages from this endpoint each time you do not have enough items for requested page.  Testing revealed requesting 10,000 items can take less than one second longer than requesting 10 items, regardless of page; yet, requests for highly referenced entities can take over five seconds.  So rather than waiting five seconds for each page of items related to a highly referenced entity, add a second to the opening request by requesting and receiving items for 100s of pages.  Do so for all entities; the additional time for moderately referenced items is negligible.

To retrieve the full list of related documents, switch to the [Search endpoint](#search).  There are some differences when going through the [Search endpoint](#search):

1. Format the same scope, search term name, and search term value in the LUX JSON Search Grammar and submit as the value of the `q` parameter.
2. Each related document will only be represented once, as opposed to once per relationship.
3. Results will not be sorted by the number of relationships.
4. Search results may not immediately describe how or how many times they are related to the document from which one started.

**URL** : `/ds/lux/relatedList.mjs`

**Method(s)** : `GET`, `POST`

**Endpoint Parameters**

| Parameter | Example | Description |
|-----------|---------|-------------|
| `scope` | `concept` | **REQUIRED** - The related list's search scope. For instance, when one is looking for concepts associated with an agent, the scope should be "concept". |
| `name` | `relatedToAgent` | **REQUIRED** - The name of the related list. Using the same concepts-from-agent example, the name should be "relatedToAgent". For a complete list of available related lists, please search for "relatedTo" in the return of the [Search Info endpoint](#search-info). Note the scope you find the related list in as that will also be needed. |
| `uri` | `https://lux.collections.yale.edu/...` | **REQUIRED** - The URI of the document to get the related documents of. For the concepts-from-agent example, this should be the agent's URI. The URI is one in the same as the document's IRI and ID. |
| `page` | `1` | **OPTIONAL** - The starting page. Defaults to 1. An error will be thrown if this value is less than 1. |
| `pageLength` | `100` | **OPTIONAL** - The number of related items per page. Default is 25. Maximum is 1,000. An error will be thrown if this value is less than 1. |
| `relationshipsPerRelation` | `100000` | **OPTIONAL** - The maximum number of relationships to process per relation.  A related list's definition is comprised of multiple relations.  Each may resolve to zero or more relationships.  Some resolve to more than a million, potentially impacting performance to the extent the request times out.  To avoid timeouts, a maximum number of relationships is applied _per relation_, meaning the maximum number of relationships processed _per request_ is the maximum multiplied by the related list's number of relations.  The per relation default is likely 250,000 but set by the `relatedListPerRelationDefault` build property.  The maximum that cannot be exceeded is likely 500,000 but set by the `relatedListPerRelationMax` build property.  If a value larger than the allowed maximum is specified, the request proceeds but the allowed maximum is applied. |

### Successful Request / Response Example

Scenario: Retrieve the places associated to an agent, as well as the search criteria for works or objects with the same relationship.

| Parameter | Value |
|-----------|-------|
| `scope` | `place` |
| `name` | `relatedToAgent` |
| `uri` | `https://lux.collections.yale.edu/data/person/82ae39e0-62d4-4088-92cf-15451c498b60` |
| `page` | `1` |
| `pageLength` | `40` (to include the top-level `next` property) |

Response Status Code: 200

Response Status Message: OK

Response Body:

*Abbreviated content shown below.*

```
{
   "@context":"https://linked.art/ns/v1/search.json",
   "id":"https://lux.collections.yale.edu/api/related-list/place?name=relatedToAgent&uri=https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fperson%2F82ae39e0-62d4-4088-92cf-15451c498b60&page=1&pageLength=40",
   "type":"OrderedCollectionPage",
   "orderedItems":[
      {
         "id":"https://lux.collections.yale.edu/api/search-estimate/work?q=%7B%22AND%22%3A%5B%7B%22publishedAt%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fplace%2Fff1686fc-1337-452d-95ec-7826869e5c07%22%7D%7D%2C%7B%22createdBy%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fperson%2F82ae39e0-62d4-4088-92cf-15451c498b60%22%7D%7D%5D%7D",
         "type":"OrderedCollection",
         "totalItems":165,
         "first":{
            "id":"https://lux.collections.yale.edu/api/search/work?q=%7B%22AND%22%3A%5B%7B%22publishedAt%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fplace%2Fff1686fc-1337-452d-95ec-7826869e5c07%22%7D%7D%2C%7B%22createdBy%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fperson%2F82ae39e0-62d4-4088-92cf-15451c498b60%22%7D%7D%5D%7D",
            "type":"OrderedCollectionPage"
         },
         "value":"https://lux.collections.yale.edu/data/place/ff1686fc-1337-452d-95ec-7826869e5c07",
         "name":"Is the Place of Publication of Works Created By"
      },
      {
         "id":"https://lux.collections.yale.edu/api/search-estimate/work?q=%7B%22AND%22%3A%5B%7B%22publishedAt%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fplace%2Fff1686fc-1337-452d-95ec-7826869e5c07%22%7D%7D%2C%7B%22aboutAgent%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fperson%2F82ae39e0-62d4-4088-92cf-15451c498b60%22%7D%7D%5D%7D",
         "type":"OrderedCollection",
         "totalItems":119,
         "first":{
            "id":"https://lux.collections.yale.edu/api/search/work?q=%7B%22AND%22%3A%5B%7B%22publishedAt%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fplace%2Fff1686fc-1337-452d-95ec-7826869e5c07%22%7D%7D%2C%7B%22aboutAgent%22%3A%7B%22id%22%3A%22https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fperson%2F82ae39e0-62d4-4088-92cf-15451c498b60%22%7D%7D%5D%7D",
            "type":"OrderedCollectionPage"
         },
         "value":"https://lux.collections.yale.edu/data/place/ff1686fc-1337-452d-95ec-7826869e5c07",
         "name":"Is the Place of Publication of Works About"
      },
      ...more items
   ],
   "next":{
      "id":"https://lux.collections.yale.edu/api/related-list/place?name=relatedToAgent&uri=https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fperson%2F82ae39e0-62d4-4088-92cf-15451c498b60&page=2&pageLength=40",
      "type":"OrderedCollectionPage"
   }
}
```

### Failed Request / Response Example

Scenario: Unknown related list.

Parameters: 

| Parameter | Value |
|-----------|-------|
| `scope` | `work` |
| `name` | `relatedToConcept` |
| `uri` | `https://lux.collections.yale.edu/data/visual/3e302b53-e383-4ef9-aab4-2fd5749b3bdb` |

Response Status Code: 400

Response Status Message: Bad Request

Response Body:
```
{
  "errorResponse":{
    "statusCode":400,
    "status":"Bad Request",
    "messageCode":"BadRequestError",
    "message":"No configuration for the 'relatedToConcept' related list in the 'work' scope."
  }
}
```

## Search

The `search` endpoint is the primary means to search LUX's backend.  A variety of search features are offered.  Usage information follows.  Additional information may be retrieved from the [Search Info endpoint](#search-info) and the [Advanced Search Configuration endpoint](#advanced-search-configuration).

**URL** : `/ds/lux/search.mjs`

**Method(s)** : `GET`, `POST`

**Endpoint Parameters**

| Parameter | Example | Description |
|-----------|---------|-------------|
| `q` | *See example below* | **REQUIRED** - The search criteria that is either stringified LUX JSON Search Grammar or LUX String Search Grammar   When using LUX JSON Search Grammar, either specify the search scope via the `_scope` *property* or the `scope` parameter.  Also include at least one search term.  Search terms vary by search scope.  For a complete list of available search terms, please review the return of the [Search Info endpoint](#search-info), specifically the `searchBy` response body property.  Some search terms accept if not require term options.  For example, one may specify the comparator operator using the `_comp` property of terms configured to the `indexedRange` pattern.  Search terms may be grouped using the `AND` and `OR` properties; the property value needs to be an array of search terms and, optionally, additional group properties.  The `NOT` property value may be set to a term or group to require the results not to have the specified criteria. The `BOOST` property may be used to provide an array containing two search terms. The first term is used for matching results and the second term will boost the score of results that match the first term.  For additional details on the LUX *String* Search Grammar, see the [Translate endpoint](#translate).|
| `scope` | `agent` | **CONDITIONALLY REQUIRED** - The scope to apply to the query.  Only required when a) using the LUX String Search Grammar or b) using the LUX JSON Search Grammar but not setting the `_scope` property. The value of the `scope` parameter is given precedence over the LUX JSON Search Grammar `_scope` property value. For a complete list of available search scopes, please review the return of the [Search Info endpoint](#search-info), specifically the `searchBy` response body property. |
| `mayChangeScope` | `true` | **OPTIONAL** - Submit `true` if the endpoint is allowed to change the search scope when the requested search's results estimate is zero yet another search scope's estimate is greater than zero.  Only applicable to search scopes associated with the user interface.  When the search scope is changed, the `metadata.changedScope` response body property value will be `true`.  Regardless, the `metadata.scope` parameter value will always align with the search *performed*.  The selected search scope is based on a user interface order specified in the endpoint.  No other part of the search is adjusted, specifically including the values of the `sort` and `facetNames` parameters.  Endpoint consumers are encouraged to submit `true` for search requests that do not require a specific user interface scope.  Subsequent requests that need to stick to a specific search should submit `false`.  Defaults to `false`. |
| `page` | 1 | **OPTIONAL** - The starting page. Defaults to 1. An error will be thrown if this value is less than 1.|
| `pageLength` | 10 | **OPTIONAL** - The number of results per page. The default is 20. The maximum is 100. An error will be thrown if this value is less than 1. |
| `sort` | `itemProductionDate:asc` | **OPTIONAL** - A comma-delimited list of sort specifications.  Each specification must include the sort binding name and may optionally include the sort's direction.  Use `asc` for ascending and `desc` for descending.  The [Search Info endpoint's](#search-info) `sortBy` response body property lists most of this parameter's accepted values. There are two additional ones: `random` and `relevance`.  When either is used, all other sort options are ignored. Use `random` to apply random scores to the search results; sort direction does not apply to this option. Use `relevance` to sort the search results by their score. For each sort binding name specified in this parameter, the default sort direction is ascending; however, when the parameter is not provided, search results are sorted by `relevance`, from highest score to lowest score (descending). A warning is included for each invalid sort option. |
| `facetsSoon` | `true` | **OPTIONAL** - Submit `true` to indicate one or more facets may be requested in a subsequent request, relatively soon, using the same criteria.  When `true` and the search is performed, search will be asked to do a little more work to speed up the subsequent request to calculate facets.  Use the [Facets endpoint](#facets) for the facet request.  Defaults to `false`. |
| `synonymsEnabled` | `true` | **OPTIONAL** - Indicate if synonyms are to be included in the search criteria. The default is controlled by the `synonymsEnabled` Gradle property, during deployment. |

### Successful Request / Response Example

Scenario: Search for the first three agents matching "ben" and boosted by "franklin". Sort the results by name. Allow the system to change the search scope should there be no results in the requested search scope.

Parameters:

| Parameter | Value |
|-----------|-------|
| `q` | `{"BOOST":[{"text":"ben","_lang":"en"},{"text":"franklin","_lang":"en"}]}` |
| `scope` | `item` |
| `mayChangeScope` | `true` |
| `page` | `1` |
| `pageLength` | `20` |
| `sort` | `itemProductionDate:desc` |

Response Status Code: 200

Response Status Message: OK

Response Body:

*Abbreviated content shown below.*

```
{
   "@context":"https://linked.art/ns/v1/search.json",
   "id":"https://lux.collections.yale.edu/api/search/item?q=%22%7B%5C%22BOOST%5C%22%3A%5B%7B%5C%22text%5C%22%3A%5C%22ben%5C%22%2C%5C%22_lang%5C%22%3A%5C%22en%5C%22%7D%2C%7B%5C%22text%5C%22%3A%5C%22franklin%5C%22%2C%5C%22_lang%5C%22%3A%5C%22en%5C%22%7D%5D%7D%22&mayChangeScope=true&page=1&pageLength=20&sort=itemProductionDate%3Adesc",
   "type":"OrderedCollectionPage",
   "partOf":[
      {
         "id":"https://lux.collections.yale.edu/api/search-estimate/item?q=%22%7B%5C%22BOOST%5C%22%3A%5B%7B%5C%22text%5C%22%3A%5C%22ben%5C%22%2C%5C%22_lang%5C%22%3A%5C%22en%5C%22%7D%2C%7B%5C%22text%5C%22%3A%5C%22franklin%5C%22%2C%5C%22_lang%5C%22%3A%5C%22en%5C%22%7D%5D%7D%22",
         "type":"OrderedCollection",
         "label":{
            "en":[
               "Objects"
            ]
         },
         "summary":{
            "en":[
               "Records representing physical and digital objects that match your search."
            ]
         },
         "totalItems":16189
      }
   ],
   "orderedItems":[
      {
         "id":"https://lux.collections.yale.edu/data/object/83c202de-a642-4fc9-9549-1c2ba5619ea7",
         "type":"HumanMadeObject"
      },
      {
         "id":"https://lux.collections.yale.edu/data/object/d947f539-559b-41c8-870f-b1f196cb85ec",
         "type":"HumanMadeObject"
      },
      ...more search results
   ],
   "next":{
      "id":"https://lux.collections.yale.edu/api/search/item?q=%22%7B%5C%22BOOST%5C%22%3A%5B%7B%5C%22text%5C%22%3A%5C%22ben%5C%22%2C%5C%22_lang%5C%22%3A%5C%22en%5C%22%7D%2C%7B%5C%22text%5C%22%3A%5C%22franklin%5C%22%2C%5C%22_lang%5C%22%3A%5C%22en%5C%22%7D%5D%7D%22&mayChangeScope=true&page=2&pageLength=20&sort=itemProductionDate%3Adesc",
      "type":"OrderedCollectionPage"
   }
}
```

### Failed Request / Response Example

Scenario: Invalid search term specified in the search criteria

Parameters:

`q`:
```
{
  "_scope":"item",
  "producedFor":{
    "startAt":{
      "partOf":{
        "name":"france"
      }
    }
  }
}
```

Response Status Code: 400

Response Status Message: "Bad Request"

Response Body:
```
{
    "errorResponse": {
        "statusCode": 400,
        "status": "Bad Request",
        "messageCode": "BadRequestError",
        "message": "The 'producedFor' term is invalid for the 'item' search scope. Valid choices: carries, classification, depth, dimension, encounteredAt, encounteredBy, encounteredDate, hasDigitalImage, height, id, identifier, iri, isOnline, material, memberOf, name, producedAt, producedBy, producedDate, producedUsing, recordType, similar, text, width"
    }
}
```

## Search Estimate

The `searchEstimate` endpoint may be used to calculate the estimated number of results for a search. The estimate is the number of _unfiltered_ results. For a brief explanation of filtered vs. unfiltered results and an alternative to this endpoint, see the [Search Will Match endpoint](#search-will-match).  For performance reasons, the [Search Will Match endpoint](#search-will-match) should be used for searches that include a related list search term (search term names that begin with "relatedTo").

**URL** : `/ds/lux/searchEstimate.mjs`

**Method(s)** : `GET`, `POST`

**Endpoint Parameters**

| Parameter | Example | Description |
|-----------|---------|-------------|
| `q` | *See example below* | **REQUIRED** - Unlike the [Facets](#facets) and [Search](#search) endpoints, this endpoint only supports the LUX JSON Search Grammar. |
| `scope` | `agent` | **CONDITIONALLY REQUIRED** - The scope to apply to the query.  Only required when the `_scope` property is not set in the `q` parameter value.  For a complete list of available search scopes, please review the return of the [Search Info endpoint](#search-info), specifically the `searchBy` response body property. |

### Successful Request / Response Example

Scenario: Successfully calculate a search estimate.

Parameters: 

`q`: `{"_scope":"agent", "name": "john smith"}`

Response Status Code: 200

Response Status Message: OK

Response Body:
```
{
    "@context": "https://lux.collections.yale.edu/api/search/1.0/context.json",
    "id": "https://lux.collections.yale.edu/api/search-estimate?q=%7B%22name%22%3A%22john%20smith%22%2C%22_scope%22%3A%22agent%22%7D",
    "type": "OrderedCollection",
    "label": {
        "en": [
            "People & Groups"
        ]
    },
    "summary": {
        "en": [
            "Records representing individuals and organizations that match your search."
        ]
    },
    "totalItems": 644,
    "first": {
        "id": "https://lux.collections.yale.edu/api/search/?q=%7B%22name%22%3A%22john%20smith%22%7D&scope=agent&page=1&pageLength=20",
        "type": "OrderedCollectionPage"
    },
    "last": {
        "id": "https://lux.collections.yale.edu/api/search/?q=%7B%22name%22%3A%22john%20smith%22%7D&scope=agent&page=33&pageLength=20",
        "type": "OrderedCollectionPage"
    },
    "partOf": "https://lux.collections.yale.edu/api/search-estimates?q=%7B%22name%22%3A%22john%20smith%22%7D"
}
```

### Failed Request / Response Example

Scenario: Used invalid search scope - `agenttt`.

Parameters: 

`q`: `{"_scope":"agenttt", "name": "maria smith"}`


Response Status Code: 200

Response Status Message: OK

Response Body:

```
{
    "errorResponse": {
        "statusCode": 400,
        "status": "Bad Request",
        "messageCode": "BadRequestError",
        "message": "Invalid search scope specified: 'agenttt'"
    }
}
```

## Search Will Match

The `searchWillMatch` endpoint may be used to determine if a search or collection of searches will return at least one result.  It differs from the [Search Estimate endpoint](#search-estimate) in that this endpoint ensures there is at least one _filtered_ search result whereas the other endpoint returns the number of _unfiltered_ results.  Unfiltered results are calculated exclusively from indexes.  There are scenarios where an estimate can be greater than zero but the search returns zero results.  When one needs to know if there is at least one filtered result and is willing to incur a performance penalty, this endpoint should be used.  For a more in-depth explanation, visit https://docs.marklogic.com/guide/performance/unfiltered as well as the "Estimate and Count" section of the [Inside MarkLogic Server whitepaper](https://www.marklogic.com/wp-content/uploads/resources/Inside-MarkLogic-Server.pdf).

**URL** : `/ds/lux/searchWillMatch.mjs`

**Method(s)** : `GET`, `POST`

**Endpoint Parameters**

| Parameter | Example | Description |
|-----------|---------|-------------|
| `q` | *See example below* | **REQUIRED** - The criteria for one or more searches. Unlike the [Facets](#facets) and [Search](#search) endpoints, this endpoint only supports the LUX JSON Search Grammar. Set the top-level property names to the name of the search and the values to the search criteria. When only wanting a single estimate, just the search criteria may be provided; the response will use `unnamed` as the search's name. |

**Response Body**

There will be one `hasOneOrMoreResult` response body property per search.  It has three possible values:

* `1`: The search would return one or more results.
* `0`: The search would return zero results.
* `-1`: An error was encountered.  Submit the associated search to the [Search endpoint](#search) for the error message.

### Successful Request / Response Example

Scenario: Successfully determine if a couple searches will return at least one result.

Parameters: 

`q`:
```
{
  "lux:conceptItemTypes":{
    "_scope":"item",
    "OR":[
      {
        "classification":{
          "id":"https://lux.collections.yale.edu/data/concept/7ff533c5-cb3a-4326-9f2c-8fff6a7ac54e"
        }
      },
      {
        "material":{
          "id":"https://lux.collections.yale.edu/data/concept/7ff533c5-cb3a-4326-9f2c-8fff6a7ac54e"
        }
      }
    ]
  },
  "lux:conceptRelatedAgents":{
    "_scope":"agent",
    "relatedToConcept":"https://lux.collections.yale.edu/data/concept/7ff533c5-cb3a-4326-9f2c-8fff6a7ac54e"
  },
  "lux:conceptRelatedConcepts":{
    "_scope":"concept",
    "relatedToConcept":"https://lux.collections.yale.edu/data/concept/7ff533c5-cb3a-4326-9f2c-8fff6a7ac54e"
  },
  "lux:conceptRelatedItems":{
    "_scope":"item",
    "OR":[
      {
        "classification":{
          "id":"https://lux.collections.yale.edu/data/concept/7ff533c5-cb3a-4326-9f2c-8fff6a7ac54e"
        }
      },
      {
        "material":{
          "id":"https://lux.collections.yale.edu/data/concept/7ff533c5-cb3a-4326-9f2c-8fff6a7ac54e"
        }
      }
    ]
  },
  "lux:conceptRelatedPlaces":{
    "_scope":"place",
    "relatedToConcept":"https://lux.collections.yale.edu/data/concept/7ff533c5-cb3a-4326-9f2c-8fff6a7ac54e"
  }
}
```

Response Status Code: 200

Response Status Message: OK

Response Body:
```
{
   "lux:conceptItemTypes":{
      "hasOneOrMoreResult":0,
      "isRelatedList":false,
      "duration":9
   },
   "lux:conceptRelatedAgents":{
      "hasOneOrMoreResult":1,
      "isRelatedList":true,
      "duration":249
   },
   "lux:conceptRelatedConcepts":{
      "hasOneOrMoreResult":1,
      "isRelatedList":true,
      "duration":65
   },
   "lux:conceptRelatedItems":{
      "hasOneOrMoreResult":0,
      "isRelatedList":false,
      "duration":4
   },
   "lux:conceptRelatedPlaces":{
      "hasOneOrMoreResult":1,
      "isRelatedList":true,
      "duration":55
   }
}
```

### Failed Request / Response Example

Scenario: Only able to calculate the estimate of one of two searches.

Parameters: 

`q`:
```
{
  "lux:conceptRelatedAgents":{
    "_scope":"agentttttt",
    "relatedToConcept":"https://lux.collections.yale.edu/data/concept/4a172143-a50e-4d91-a88b-a9931bceecf1"
  },
  "lux:conceptRelatedConcepts":{
    "_scope":"concept",
    "relatedToConcept":"https://lux.collections.yale.edu/data/concept/4a172143-a50e-4d91-a88b-a9931bceecf1"
  },
  "lux:conceptRelatedPlaces":{
    "_scope":"place",
    "relatedToConcept":"https://lux.collections.yale.edu/data/concept/4a172143-a50e-4d91-a88b-a9931bceecf1"
  }
}
```

Response Status Code: 200

Response Status Message: OK

Response Body:
```
{
  "lux:conceptRelatedAgents":{
    "hasOneOrMoreResult":-1
  },
  "lux:conceptRelatedConcepts":{
    "hasOneOrMoreResult":1,
    "isRelatedList":true,
    "duration":134
  },
  "lux:conceptRelatedPlaces":{
    "hasOneOrMoreResult":1,
    "isRelatedList":true,
    "duration":57
  }
}
```

## Search Info

The `searchInfo` endpoint provides consumers:

1. A complete list of search scopes and search terms therein that may be used to construct and pass search criteria into any endpoint that supports the LUX JSON Search Grammar.
2. Information about each search term, including its target search scope and what it accepts (e.g, atomic value, child `id` search term).
3. A list of facets and their associated search term names.
4. A list of sort bindings implemented with range indexes.  As detailed in the [Search endpoint](#search)'s documentation, additional sort parameter values include `random` and `relevance`.

Differences between the [Advanced Search Configuration endpoint](#advanced-search-configuration) and this endpoint include a) [Advanced Search Configuration endpoint](#advanced-search-configuration) defines each terms default search options and b) the `searchInfo` endpoint does not filter any search terms out.

**URL** : `/ds/lux/searchInfo.mjs`

**Method(s)** : `GET`, `POST`

**Endpoint Parameters** : None

### Successful Request / Response Example

Scenario: Successfully retrieve the data.

Parameters: None

Response Status Code: 200

Response Status Message: OK

Response Body:

*Abbreviated content shown below.*

```
{
  "searchBy":{
    "agent":[
      {
        "name":"activeAt",
        "targetScope":"place",
        "acceptsGroup":true,
        "acceptsTerm":true,
        "acceptsIdTerm":true,
        "onlyAcceptsId":false,
        "acceptsAtomicValue":false
      },
      {
        "name":"activeDate",
        "targetScope":"agent",
        "acceptsGroup":false,
        "acceptsTerm":false,
        "acceptsIdTerm":false,
        "onlyAcceptsId":false,
        "acceptsAtomicValue":true,
        "scalarType":"dateTime"
      },
      {
        "name":"any",
        "targetScope":"agent",
        "acceptsGroup":true,
        "acceptsTerm":true,
        "acceptsIdTerm":true,
        "onlyAcceptsId":false,
        "acceptsAtomicValue":false
      },
      ...more agent search terms
    ],
    "concept":[
      {
        "name":"any",
        "targetScope":"concept",
        "acceptsGroup":true,
        "acceptsTerm":true,
        "acceptsIdTerm":true,
        "onlyAcceptsId":false,
        "acceptsAtomicValue":false
      },
      {
        "name":"broader",
        "targetScope":"concept",
        "acceptsGroup":true,
        "acceptsTerm":true,
        "acceptsIdTerm":true,
        "onlyAcceptsId":false,
        "acceptsAtomicValue":false
      },
      {
        "name":"classification",
        "targetScope":"concept",
        "acceptsGroup":true,
        "acceptsTerm":true,
        "acceptsIdTerm":true,
        "onlyAcceptsId":false,
        "acceptsAtomicValue":false
      },
      ...more concept search terms.
    ],
    ...search terms for the event, item, place, reference, set, and work.
  },
  "facetBy":[
    {
      "name":"agentActiveDate",
      "searchTermName":"agentActiveDate",
      "idFacet":false
    },
    {
      "name":"agentActivePlaceId",
      "searchTermName":"activeAt",
      "idFacet":true
    },
    {
      "name":"agentEndDate",
      "searchTermName":"agentEndDate",
      "idFacet":false
    },
    {
      "name":"agentEndPlaceId",
      "searchTermName":"endAt",
      "idFacet":true
    },
    ...more facets
  ],
  "sortBy":[
    "agentActiveDate",
    "agentEndDate",
    "agentStartDate",
    "anySortName",
    ...more to sort by
  ]
}
```

### Failed Request / Response Example

*Only known scenarios would be an authentication error and internal server error.*

## Stats

The `stats` endpoint enables consumers to get document estimates by context. The contexts align with the frontend's search contexts. Each context is associated to one or more document types. Additional information may be included in the future.

**URL** : `/ds/lux/stats.mjs`

**Method(s)** : `GET`, `POST`

**Endpoint Parameters** : None

### Successful Request / Response Example

Scenario: stats returns estimates

Parameters: None

Response Status Code: 200

Response Status Message: OK

Response Body:

```
{
   "estimates":{
      "searchScopes":{
         "agent":5686344,
         "concept":4883700,
         "event":38178,
         "item":17186764,
         "place":617915,
         "reference":11224990,
         "set":300030,
         "work":13233573
      }
   },
   "metadata":{
      "timestamp":"2024-02-21T02:53:03.551",
      "milliseconds":8
   }
}
```

### Failed Request / Response Example

*Only known scenarios would be an authentication error and internal server error.*

## Translate

The `translate` endpoint enables consumers to convert search criteria from the LUX String Search Grammar to the LUX JSON Search Grammar.  

The LUX JSON String Grammar:

  1. Is intended for keyword search.
  2. Facilities converting an end-user's initial or simple search into the LUX JSON Search Grammar.
  3. Supports a subset of the [Basic Components and Operators](https://docs.marklogic.com/guide/search-dev/cts_query#id_14520) portion of MarkLogic's search string grammar.
  4. Is accepted by the [Facets endpoint](#facets), [Search endpoint](#search), and the [Translate endpoint](#translate).
  5. Is not accepted by the [Search Estimate endpoint](#search-estimate) and [Search Will Match endpoint](#search-will-match).
  6. Is not able to tap into all of the features supported by the LUX JSON Search Grammar, specifically all non-full text search terms and everything they are capable of (e.g., hop search criteria, date and dimension comparisons, and constraining by facet values).

For more information on the LUX JSON Search Grammar, see the [Search endpoint](#search)'s documentation for its `q` parameter.

**URL** : `/ds/lux/translate.mjs`

**Method(s)** : `GET`, `POST`

**Endpoint Parameters**

| Parameter | Example | Description |
|-----------|---------|-------------|
| `q` | *See example below* | **REQUIRED** - Search criteria in the LUX String Search Grammar. |
| `scope` | "agent" | **REQUIRED** - A valid search scope. |

The [Search endpoint](#search)'s documentation may include additional details on the above parameters. The parameters in this context are more restrictive; e.g., the `scope` parameter is required.

### Successful Request / Response Example

Scenario: Translate the search criteria for `cat dog` from the LUX String Search Grammar to the LUX JSON Search Grammar.

Parameters:

| Parameter | Value |
|-----------|-------|
| `q` | `cat dog` |
| `scope` | `work` |

Response Status Code: 200

Response Status Message: OK

Response Body:

```
{
  "_scope":"work",
  "AND":[
    {
      "text":"cat",
      "_lang":"en"
    },
    {
      "text":"dog",
      "_lang":"en"
    }
  ]
}
```

### Failed Request / Response Example

Scenario: Submit an invalid string grammar query

Parameters:

| Parameter | Value |
|-----------|-------|
| `q` | `{""}` |
| `scope` | `work` |

Response Status Code: 400

Response Body:
```
{
    "errorResponse": {
        "statusCode": 400,
        "status": "Bad Request",
        "messageCode": "BadRequestError",
        "message": "Unable to parse the search criteria via string grammar: {\"\"}"
    }
}
```
