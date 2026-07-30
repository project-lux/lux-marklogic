import { DatasetTestBase } from '../DatasetTestBase.mjs';
import {
  getConfigurationByContext,
  getContextParameterValues,
} from '../../../config/autoCompleteConfig.mjs';
import { getSearchTermsConfig } from '../../../config/searchTermsConfig.mjs';
import { SORT_BINDINGS } from '../../../config/searchResultsSortConfig.mjs';
import {
  getArrayDiff,
  isNonEmptyArray,
  sortObj,
} from '../../../utils/utils.mjs';

const TEST_ID = 'index-comparison';

// Retrieve configured field and field range index names from the database.
function getConfiguredIndexNames() {
  const admin = require('/MarkLogic/admin.xqy');
  const config = admin.getConfiguration();
  const dbId = xdmp.database();

  const fieldNames = [];
  admin
    .databaseGetFields(config, dbId)
    .toArray()
    .forEach((node) => {
      const name = node.xpath('field-name/text()').toString();
      if (name.length > 0) {
        fieldNames.push(name);
      }
    });

  const fieldRangeNames = [];
  admin
    .databaseGetRangeFieldIndexes(config, dbId)
    .toArray()
    .forEach((node) => {
      const name = node.xpath('field-name/text()').toString();
      if (name.length > 0) {
        fieldRangeNames.push(name);
      }
    });

  return {
    fields: fieldNames.sort(),
    fieldRanges: fieldRangeNames.sort(),
  };
}

// Collect field and field range index names referenced by the codebase.
function getReferencedIndexNames() {
  const referenced = {
    fields: {},
    fieldRanges: {},
  };

  const recordReference = (name, isRange, context) => {
    const typeKey = isRange ? 'fieldRanges' : 'fields';
    if (!referenced[typeKey][name]) {
      referenced[typeKey][name] = [context];
    } else if (!referenced[typeKey][name].includes(context)) {
      referenced[typeKey][name].push(context);
    }
  };

  // Auto complete references.
  const recordAutoCompleteReference = (name) => {
    if (name != null) {
      recordReference(name, true, 'auto complete');
      if (name.includes('Primary')) {
        recordReference(name.replace('Primary', ''), true, 'auto complete');
      }
    }
  };

  getContextParameterValues().forEach((autoCompleteContext) => {
    const autoCompleteConfig = getConfigurationByContext(autoCompleteContext);
    recordAutoCompleteReference(autoCompleteConfig.namesIndexReference);
    if (isNonEmptyArray(autoCompleteConfig.idsIndexReferences)) {
      autoCompleteConfig.idsIndexReferences.forEach((name) => {
        recordAutoCompleteReference(name);
      });
    }
  });

  // Sort binding references.
  Object.keys(SORT_BINDINGS).forEach((key) => {
    if (SORT_BINDINGS[key].indexReference) {
      recordReference(SORT_BINDINGS[key].indexReference, true, 'sort');
    }
  });

  // Search term references.
  const searchTermsConfig = getSearchTermsConfig();
  Object.keys(searchTermsConfig).forEach((searchScope) => {
    Object.keys(searchTermsConfig[searchScope]).forEach((termName) => {
      const term = searchTermsConfig[searchScope][termName];
      if (term.indexReferences) {
        term.indexReferences.forEach((name) => {
          const isRange =
            !name.endsWith('Text') &&
            !name.endsWith('Name') &&
            name !== 'placeSpatial';
          recordReference(name, isRange, 'search');
        });
      }
      if (term.idIndexReferences) {
        term.idIndexReferences.forEach((name) => {
          recordReference(name, true, 'search');
        });
      }
    });
  });

  // A field range index cannot exist without a field.
  const referencedFieldRangeNames = Object.keys(referenced.fieldRanges).sort();
  const referencedFieldNames = Object.keys(referenced.fields);
  referencedFieldRangeNames.forEach((name) => {
    if (!referencedFieldNames.includes(name)) {
      referencedFieldNames.push(name);
    }
  });

  return {
    fields: referencedFieldNames.sort(),
    fieldRanges: referencedFieldRangeNames,
    references: referenced,
  };
}

function computeScore(configured, referenced) {
  const missingFields = getArrayDiff(
    referenced.fields,
    configured.fields,
  ).sort();
  const unusedFields = getArrayDiff(
    configured.fields,
    referenced.fields,
  ).sort();
  const missingFieldRanges = getArrayDiff(
    referenced.fieldRanges,
    configured.fieldRanges,
  ).sort();
  const unusedFieldRanges = getArrayDiff(
    configured.fieldRanges,
    referenced.fieldRanges,
  ).sort();

  // Referenced but not configured (missing) is a hard fail.
  const missingCount = missingFields.length + missingFieldRanges.length;
  const score = missingCount > 0 ? 0 : 1.0;

  return {
    score: score,
    missing: {
      fields: missingFields,
      fieldRanges: missingFieldRanges,
    },
    unused: {
      fields: unusedFields,
      fieldRanges: unusedFieldRanges,
    },
  };
}

class IndexComparison extends DatasetTestBase {
  getId() {
    return TEST_ID;
  }
  getName() {
    return 'Index Comparison';
  }
  getCategory() {
    return 'indexing';
  }
  getDefaultThreshold() {
    return 1.0;
  }

  run(context) {
    const configured = getConfiguredIndexNames();
    const referenced = getReferencedIndexNames();
    const { score, missing, unused } = computeScore(configured, referenced);

    const missingCount = missing.fields.length + missing.fieldRanges.length;
    const unusedCount = unused.fields.length + unused.fieldRanges.length;

    let message;
    if (missingCount === 0 && unusedCount === 0) {
      message =
        'All referenced indexes are configured and no unused indexes found.';
      context.addInformationalFinding(message);
    } else {
      const parts = [];
      if (missingCount > 0) {
        const missingMessage = `${missingCount} referenced index(es) not configured`;
        parts.push(missingMessage);
        context.addCriticalFinding(missingMessage);
      }
      if (unusedCount > 0) {
        const unusedMessage = `${unusedCount} configured index(es) not referenced by code`;
        parts.push(unusedMessage);
        context.addInformationalFinding(unusedMessage);
      }
      message = parts.join('; ') + '.';
    }

    context.setScore(score);
    context.setMessage(message);

    return {
      missing: missing,
      unused: unused,
      references: sortObj(referenced.references.fields),
      rangeReferences: sortObj(referenced.references.fieldRanges),
    };
  }
}

DatasetTestBase.register(TEST_ID, new IndexComparison());

export { TEST_ID };
