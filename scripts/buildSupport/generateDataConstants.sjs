xdmp.invoke(
  '/runDuringDeployment/dataConstants/dataConstantsGenerator.mjs',
  {},
  {
    database: xdmp.database('%%luxContentDatabase%%'),
    modules: xdmp.database('%%luxModulesDatabase%%'),
    root: '',
  }
);
