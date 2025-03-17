const admin = require('/MarkLogic/admin.xqy');
const config = admin.getConfiguration();
const appservers = admin.getAppserverIds(config);
let response = '';
if (parseInt(xdmp.version().split('.')[0], 10) >= 12) {
  const minVersion = 'TLSv1.2';
  for (const item of appservers) {
    const appservername = admin.appserverGetName(config, item);
    if (appservername !== 'HealthCheck') {
      admin.saveConfiguration(
        admin.appserverSetSslMinAllowTls(config, item, minVersion)
      );
      response = response.concat(
        ` ${appservername}: minimum set to ${minVersion}`
      );
    }
  }
} else {
  response = 'setSslMinAllowTls does not apply to ML versions <= 11';
}
response;
