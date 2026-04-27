const msg = xdmp.invoke(
  '/runDuringDeployment/removeOfflineDynamicHosts.mjs',
  {},
  {
    database: xdmp.database('%%tenantContentDatabase%%'),
    modules: xdmp.database('%%tenantModulesDatabase%%'),
    root: '',
  },
);

msg;
export default msg;
