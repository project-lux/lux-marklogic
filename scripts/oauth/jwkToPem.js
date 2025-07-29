/* This script converts JWK to PEM format
 * Cognito provides JWKs for public keys, MarkLogic config requires PEM format.
 *
 *  Steps to run this script:
 * 1. Install node.js, if not already installed
 * 2. cd into the scripts/oauth directory
 * 3. Run `npm install`
 * 4. Insert the contents of ${COGNITO_URL}/.well-known/jwks.json file below
 * 5. Execute `node jwkToPem.js`
 * 6. Console output can be copied into src/main/public-keys/oauth-${env}.xml
 */

const jwkToPem = require('jwk-to-pem');
const jwks = /*INSERT CONTENTS OF ${COGNITO_URL}/.well-known/jwks.json HERE*/

const pems = jwks.keys.map(
  (jwk) => `  <oauth-jwt-secret>
    <oauth-jwt-key-id>${jwk.kid}</oauth-jwt-key-id>
    <oauth-jwt-secret-value>${jwkToPem(jwk).trim()}</oauth-jwt-secret-value>
  </oauth-jwt-secret>`
);
console.log('<oauth-jwt-secrets>');
pems.forEach((pem) => console.log(pem));
console.log('</oauth-jwt-secrets>');
