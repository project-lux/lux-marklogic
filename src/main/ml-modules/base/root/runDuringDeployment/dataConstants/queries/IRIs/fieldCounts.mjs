import { FACETS_CONFIG } from '../../../../config/facetsConfig.mjs';

const results = Object.keys(FACETS_CONFIG).map((facetName) => {
  const fieldName = FACETS_CONFIG[facetName].indexReference;
  try {
    return {
      fieldName: fieldName,
      fieldCount: fn.count(cts.fieldValues(fieldName)),
    };
  } catch (e) {
    console.warn(
      `Exception encountered while determining the number of values in the '${fieldName}' field range index.  Perhaps this environment does not have this index yet?`
    );
    return {
      fieldName: fieldName,
      fieldCount: -1,
    };
  }
});
results;
