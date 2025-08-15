const admin = require('/MarkLogic/admin.xqy');
const config = admin.getConfiguration();
const appservers = admin.getAppserverIds(config);
let response = '';
if (parseInt(xdmp.version().split('.')[0], 10) <= 11) {
  const protocolsToDisable = ['SSLv3', 'TLSv1', 'TLSv1_1'];
  for (const item of appservers) {
    const appservername = admin.appserverGetName(config, item);
    if (appservername !== 'HealthCheck') {
      admin.saveConfiguration(
        admin.appserverSetSslDisabledProtocols(config, item, protocolsToDisable)
      );
    }
    response = response.concat(
      ` ${appservername}: ${protocolsToDisable.toString()}`
    );
  }
} else {
  response =
    'disableDeprecatedSSLProtocols does not apply to ML versions >= 12';
}

response;
export default response;
