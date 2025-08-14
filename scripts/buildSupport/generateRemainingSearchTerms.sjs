const response = xdmp.invoke(
  '/runDuringDeployment/generateRemainingSearchTerms.mjs',
  {},
  {
    database: xdmp.database('%%tenantContentDatabase%%'),
    modules: xdmp.database('%%tenantModulesDatabase%%'),
    root: '',
  }
);

response;
export default response;
