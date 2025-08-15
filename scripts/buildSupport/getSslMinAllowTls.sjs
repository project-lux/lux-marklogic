const admin = require('/MarkLogic/admin.xqy');
const config = admin.getConfiguration();
const appservers = admin.getAppserverIds(config);
let response = '';
if (parseInt(xdmp.version().split('.')[0], 10) >= 12) {
  for (item of appservers) {
    const appservername = admin.appserverGetName(config, item);
    response = response.concat(
      ` ${appservername}: minimum is ${admin.appserverGetSslMinAllowTls(
        config,
        item
      )}`
    );
  }
} else {
  response = 'getSslMinAllowTls does not apply to ML versions <= 11';
}

response;
export default response;
