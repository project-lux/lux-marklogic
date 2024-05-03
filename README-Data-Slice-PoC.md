# Data Slice Proof of Concept

## Pieces of the Pie

Depending on the service account used and the data that account has access to, results for the same search criteria can vary.  To pull this off:

1. Additional roles are to be defined per participating unit --units that want a LUX-based unit portal restricted to their data.
2. The data pipeline is to set the `admin/sources` property in each record to each unit that contributed to the record, and thus should have access.
3. The data pipeline is to continue embedding triples within the HumanMadeObject, Person, Place, etc. records.  MarkLogic's triple store honors the permissions of the documents the triples are defined within.
4. Document are to be loaded via /v1/documents (directly or through MLCP) and specify a new transform, [documentTransforms.sjs](/src/main/ml-modules/base/root/documentTransforms.sjs).  The transform is responsible for mapping `admin/sources` property values to role names and granting read permission to these roles.  A naming convention is employed.  For directions on specifying the transform when consuming the endpoint directly, see https://docs.marklogic.com/REST/POST/v1/documents.  For MLCP, see [lux-backend-import-data.md](/docs/lux-backend-import-data.md) or https://docs.marklogic.com/11.0/guide/mlcp-guide/en/importing-content-into-marklogic-server.html.

At this point, use a service account to consume the endpoints.  Endpoint responses can vary by service account, including /stats.

For more information on consuming endpoints, see [lux-backend-api-usage.md](/docs/lux-backend-api-usage.md).

## Triple and Document Visibility Check

A couple scripts specific to this effort were developed, one of which survived: [checkTripleAndDocVisibilityByUser.js](/scripts/checkTripleAndDocVisibilityByUser.js).  The script seeks out triples, field values, and documents the specified user(s) has access to, limited by configuration including predicate, number of hops, field name, number of field values, and a few other settings.  See comments in the script for additional details.
