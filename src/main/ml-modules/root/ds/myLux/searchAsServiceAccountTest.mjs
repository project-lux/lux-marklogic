/*
 * Instructions:
 *
 * 1. Create a user's read role; e.g., "jenny-read".  The user's update role is
 * not needed by this experiment.
 *
 * 2. Create the user's account and grant them their read role.
 *
 * 3. Create a document and only grant that user's read role the read permission.
 *
 * 4. Modify the cts.documentQuery within searchTest.mjs to include the new doc's
 * URI and a URI that the lux-endpoint-consumer role has read access to.  Save.
 *
 * 5. Deploy the role, amp, and new code already in this branch using:
 *
 *    ./gradlew mlDeploySecurity mlLoadModules
 *
 * 6. Consumer the searchAsServiceAccountTest.mjs data service using the new
 * user's credentials.  Do it once without specifying the serviceAccountName
 * parameter, then again setting that parameter to 'lux-endpoint-consumer'. You
 * should get one result then two, respectively.
 */

import { search } from '../../lib/searchTest.mjs';

const serviceAccountName = external.serviceAccountName;
search(serviceAccountName);
