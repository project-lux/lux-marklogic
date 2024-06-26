xdmp.invoke(
  '/runDuringDeployment/dataConstants/dataConstantsGenerator.mjs',
  {},
  {
    database: xdmp.database('%%tenantContentDatabase%%'),
    modules: xdmp.database('%%tenantModulesDatabase%%'),
    root: '',
  }
);
