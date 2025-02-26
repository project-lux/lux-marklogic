# Extended Endpoint Configuration

## Approach

A version of the My Collections design calls for extended endpoint configuration to support rules that we don't otherwise have a means to enforce.

While an alternative approach may be selected ("amp user with service account"), the prototype work for this approach is being captured.

This prototype targeted one need: enable unit portals to provide their users with the My Collections feature yet restrict content access to that of the portal.

The approach:

1. All endpoints would continue to pass a function into `handleRequest`.
2. A subset would start to accept the optional `serviceAccountName` parameter, passing its value into `handleRequest`.
3. `handleRequest` would instantiate an instance of `EndpointConfig`, a new class.
4. `EndpointConfig` would require the current request's endpoint to be configured, and configured with all required properties, property values, property value types, etc.
5. `handleRequest` would then use the instance of `EndpointConfig` to determine how to process the request.  Possible outcomes:
    * Execute the request as the requesting user.
    * Execute the request as the specified service account.
    * Execute the provided function as the requesting user and feed that into a second function that is executed as the specified service account.

What this approach doesn't yet address is how to access *referenced* My Collections given, at that point, the executing user would be a service account.

This approach does have the ability to configure which requests should be rejected when in read-only mode (e.g., during a blue/green switch).  This could be implemented differently alongside the "amp user with service account" approach.

## Try It Out

As shown below, the configuration for four endpoints is defined.  After running `mlDeploySecurity` and `mlDeployModules`, here's what one may expect:

1. `/ds/lux/stats.mjs` counts can vary based on the value of the (optional) `serviceAccountName` parameter.

*The following three endpoints are copies of document.mjs, but are configured differently.*

2. `/ds/myLux/createSet.mjs` will return the same document/result regardless of being provided a `serviceAccountName` parameter.
3. When the `serviceAccountName` parameter is given to `/ds/myLux/readSet.mjs`, it will retrieve the document as the requesting user and then executing the function configured to `receivingServiceAccountFunction` as the service account, passing in the document.  The intent here is to enable the user to access their My Collection then trim it to the referenced content therein that the service account has access to.
4. All requests to `` will fail due to the endpoint being improperly configured.

5. Requests to any other endpoints will fail as they are not configured in [endpointsConfig.mjs](/src/main/ml-modules/root/config/endpointsConfig.mjs).

Contents of [endpointsConfig.mjs](/src/main/ml-modules/root/config/endpointsConfig.mjs):

```javascript
const ENDPOINTS_CONFIG = {
  '/ds/lux/stats.mjs': {
    executeAsServiceAccountWhenSpecified: true,
  },
  '/ds/myLux/createSet.mjs': {
    executeAsServiceAccountWhenSpecified: false,
  },
  '/ds/myLux/readSet.mjs': {
    executeAsServiceAccountWhenSpecified: true,
    receivingServiceAccountFunction: readSet,
  },
  '/ds/myLux/downloadSet.mjs': {
    executeAsServiceAccountWhenSpecified: true,
    receivingServiceAccountFunction: 'not a function',
  },
};
```

