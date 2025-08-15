'use strict';

const op = require('/MarkLogic/optic');

// prefixer is a factory for sem:iri() constructors in a namespace
const lux = op.prefixer('https://lux.collections.yale.edu/data/');
const crm = op.prefixer('http://www.cidoc-crm.org/cidoc-crm/');
const rdfs = op.prefixer('http://www.w3.org/2000/01/rdf-schema#');
const la = op.prefixer('https://linked.art/ns/terms/');
const rdfSyntax = op.prefixer('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
const rdfSchema = op.prefixer('http://www.w3.org/2000/01/rdf-schema');
const skos = op.prefixer('http://www.w3.org/2004/02/skos/core#');

/*
const activity = op.col('activity');
const label = op.col('label')

const Plan = op.fromTriples([
  //op.pattern(crm('E33_Linguistic_Object'), rdfSchema('label'), label),
  op.pattern(activity, rdfSyntax('type'), crm('E33_Linguistic_Object'))
]);
Plan.limit(10).result();
*/

const predicate = op.col('predicate');
const object = op.col('object');

const subject = op.col('subject');
//const concept = op.col('concept');
const concept = lux('concept/72c72083-61bf-4375-bd15-8e598e9fcee4');
const label = op.col('label');
const thePlan = op.fromTriples([
  op.pattern(subject, crm('P2_has_type'), concept),
  op.pattern(subject, rdfs('label'), label),
]);

/*
const thePlan = op.fromTriples([
  op.pattern(lux('activity/0e53b72d-702e-4c2e-a7cd-324038ea122b'), predicate, object)
]);
*/

const results = thePlan.limit(100).select(['label']).result();

results;
export default results;
