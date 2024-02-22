xdmp.invoke(
  '/runDuringDeployment/generateRelatedListsConfig.mjs',
  {},
  {
    database: xdmp.database('%%luxContentDatabase%%'),
    modules: xdmp.database('%%luxModulesDatabase%%'),
    root: '',
  }
);
