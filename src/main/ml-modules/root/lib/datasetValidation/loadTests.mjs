/*
 * Barrel module: importing this file guarantees every dataset validation test
 * is registered with DatasetTestBase.  All consumers that need the registry
 * should import from here instead of individual test files.
 */

// Side-effect imports: each test self-registers with DatasetTestBase.
import './tests/predicateCoverage.mjs';
import './tests/predicateAlignment.mjs';
import './tests/rangeIndexCoverage.mjs';
import './tests/recordTypesByPredicates.mjs';
import './tests/indexComparison.mjs';

// Re-export DatasetTestBase so consumers need only one import.
export { DatasetTestBase } from './DatasetTestBase.mjs';
