/**
 * NOTICE: This file has been refactored into focused test files
 *
 * The comprehensive process() method tests have been split into:
 * - 0301-process-scopeResolution.mjs - Scope validation and resolution
 * - 0302-process-queryGeneration.mjs - Query generation, grammar parsing, search patterns
 * - 0303-process-errorHandling.mjs - Error conditions and validation
 * - 0304-process-parameterHandling.mjs - Pagination, options, parameter propagation
 * - 0305-process-multiScope.mjs - Multi-scope search functionality
 *
 * This approach provides:
 * ✅ Focused single-concern testing
 * ✅ Direct value comparison instead of derived booleans
 * ✅ Simplified input structure with helpers
 * ✅ Grammar parsing and query correctness validation
 * ✅ Better test coverage and maintainability
 *
 * Please use the focused test files for any new process() tests.
 */

import { testHelperProxy } from '/test/test-helper.mjs';

const LIB = '0300 process.mjs';
console.log(`${LIB}: REFACTORED - See focused test files 0301-0305.`);

let assertions = [];

// This file now serves as documentation of the refactoring
assertions.push(
  testHelperProxy.assertTrue(
    true,
    'Process tests have been successfully refactored into focused files',
  ),
);

console.log(
  `${LIB}: Tests moved to focused files. Use 0301-0305 for process() testing.`,
);

assertions;
export default assertions;
