const op = require('/MarkLogic/optic');
const optimizedPlan = op.fromLexicons({
  langIri: cts.uriReference(),
  langCode: cts.fieldReference('languageIdentifier'),
});
const results = Array.from(optimizedPlan.result());
results;
