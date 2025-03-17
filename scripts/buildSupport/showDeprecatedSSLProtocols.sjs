const admin = require('/MarkLogic/admin.xqy');
const config = admin.getConfiguration();
const appservers = admin.getAppserverIds(config);
let response = '';
if (parseInt(xdmp.version().split('.')[0], 10) <= 11) {
  for (item of appservers) {
    const appservername = admin.appserverGetName(config, item);
    response = response.concat(
      ` ${appservername}: ${admin
        .appserverGetSslDisabledProtocols(config, item)
        .toArray()
        .toString()}`
    );
  }
} else {
  response = 'showDeprecatedSSLProtocols does not apply to ML versions >= 12';
}
response;
