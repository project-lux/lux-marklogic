xdmp.invoke(
  '/runDuringDeployment/generateAdvancedSearchConfig.mjs',
  {},
  {
    database: xdmp.database('%%tenantContentDatabase%%'),
    modules: xdmp.database('%%tenantModulesDatabase%%'),
    root: '',
  }
);
