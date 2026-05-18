# Problem Description
Document permission checks are imposed on non-admins and can slow operations. The document permission checks are unnecessary when both of the following are true:

The user has read-access to every document.
The request is read-only.
A five keyword OR'd search executed in 1.8 seconds as a non-admin and 1.3 seconds as an admin (Query ID: q07-optic-pattern-d-non-con; included in the UAT/LUX Examples section).

# Expected Behavior/Solution
For read-only requests and users that have read-access to every document in the database (i.e., all users less unit portal service accounts), amp the user to that of an admin. We need only entertain this for a subset of the read-only requests.

We should see how much of this can be controlled by extending src/main/ml-modules/root/config/endpointsConfig.mjs

Included:

1. src/main/ml-modules/root/ds/lux/search
2. src/main/ml-modules/root/ds/lux/searchWillMatch
3. src/main/ml-modules/root/ds/lux/searchEstimate
4. src/main/ml-modules/root/ds/lux/facets
5. src/main/ml-modules/root/ds/lux/relatedList

Excluded (fast enough, write-op, not in use, or otherwise not applicable):

1. src/main/ml-modules/root/ds/lux/advancedSearchConfig
2. src/main/ml-modules/root/ds/lux/autoComplete
3. src/main/ml-modules/root/ds/lux/document/*
4. src/main/ml-modules/root/ds/lux/tenantStatus/*
5. src/main/ml-modules/root/ds/lux/scaleOut
6. src/main/ml-modules/root/ds/lux/searchInfo
7. src/main/ml-modules/root/ds/lux/stats
8. src/main/ml-modules/root/ds/lux/storageInfo
9. src/main/ml-modules/root/ds/lux/translate
10. src/main/ml-modules/root/ds/lux/versionInfo

# Requirements

* See above.
* Read-only requests from users will amp the user to that of an admin.
* Users that had read-access to every document in the database (i.e., all users less unit portal service accounts) will also amp the user to that of an admin.
