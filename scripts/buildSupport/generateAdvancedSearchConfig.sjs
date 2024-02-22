xdmp.invoke(
  '/runDuringDeployment/generateAdvancedSearchConfig.mjs',
  {},
  {
    database: xdmp.database('%%luxContentDatabase%%'),
    modules: xdmp.database('%%luxModulesDatabase%%'),
    root: '',
  }
);
