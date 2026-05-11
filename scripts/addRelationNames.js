// BEGIN CONFIG - edit these
const RELATION_NAMES = {
  // copy from relationNames.mjs
};

const relatedListConfig = {
  // copy from deployed /config/relatedListConfig.mjs
  // only copy the contents of a single tenant e.g. {"lux": { COPY_HERE }}
};

// how big is the largest maxLevel in searchTermsConfig.mjs? We want to remove relation keys that are too long
const LARGEST_MAX_LEVEL = 1;

// END CONFIG

// BEGIN SCRIPT

// remove relation keys that are too long
for (const key of Object.keys(RELATION_NAMES)) {
  if (key.split('-').length > LARGEST_MAX_LEVEL + 1) {
    delete RELATION_NAMES[key];
  }
}

for (const scope of Object.keys(relatedListConfig)) {
  const relatedTerms = relatedListConfig[scope];
  for (const relatedTerm of Object.keys(relatedTerms)) {
    const searchConfigs = relatedTerms[relatedTerm].searchConfigs;
    for (const searchConfig of searchConfigs) {
      if (!RELATION_NAMES.hasOwnProperty(searchConfig.relationKey)) {
        RELATION_NAMES[searchConfig.relationKey] = 'TODO';
      }
    }
  }
}

const SORTED_NAMES = Object.fromEntries(
  Object.entries(RELATION_NAMES).sort((a, b) => a[0].localeCompare(b[0])),
);
console.dir(SORTED_NAMES, { depth: null });
