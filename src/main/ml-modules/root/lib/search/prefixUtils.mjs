const sem = require('/MarkLogic/semantics.xqy');

const PREFIX_MAPPINGS = {
  crm: 'http://www.cidoc-crm.org/cidoc-crm/',
  la: 'https://linked.art/ns/terms/',
  lux: 'https://lux.collections.yale.edu/ns/',
  skos: 'http://www.w3.org/2004/02/skos/core#',
};

function getPrefixesForSPARQL() {
  return Object.entries(PREFIX_MAPPINGS)
    .map(([prefix, uri]) => `PREFIX ${prefix}: <${uri}>`)
    .join('\n');
}

function expandPredicate(predicate) {
  return sem.curieExpand(predicate, PREFIX_MAPPINGS);
}

function expandPredicates(predicates) {
  return predicates.map((predicate) => expandPredicate(predicate));
}

function formatPredicatesForSPARQL(predicates, transitive = true) {
  const individuals = transitive
    ? predicates.map((predicate) => {
        // Omit + only if we decide to optimize the single-predicate case later.
        return predicate.concat('+');
      })
    : predicates;
  return `(${individuals.join(' | ')})`;
}

export {
  PREFIX_MAPPINGS,
  expandPredicate,
  expandPredicates,
  formatPredicatesForSPARQL,
  getPrefixesForSPARQL,
};
