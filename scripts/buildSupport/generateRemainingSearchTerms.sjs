xdmp.invoke(
  '/runDuringDeployment/generateRemainingSearchTerms.mjs',
  {},
  {
    database: xdmp.database('%%luxContentDatabase%%'),
    modules: xdmp.database('%%luxModulesDatabase%%'),
    root: '',
  }
);
