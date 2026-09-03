/*
 * Barrel module: importing this file guarantees every dataset validation test
 * is registered with DatasetTestBase.  All consumers that need the registry
 * should import from here instead of individual test files.
 */

// Side-effect imports: each test self-registers with DatasetTestBase.
import '/lib/datasetValidation/tests/predicateCoverage.mjs';
import '/lib/datasetValidation/tests/predicateAlignment.mjs';
import '/lib/datasetValidation/tests/rangeIndexCoverage.mjs';
import '/lib/datasetValidation/tests/recordTypesByPredicates.mjs';
import '/lib/datasetValidation/tests/indexComparison.mjs';
import '/lib/datasetValidation/tests/scopeEstimates.mjs';
import '/lib/datasetValidation/tests/storageInfo.mjs';

// Re-export DatasetTestBase so consumers need only one import.
export { DatasetTestBase } from '/lib/datasetValidation/DatasetTestBase.mjs';
