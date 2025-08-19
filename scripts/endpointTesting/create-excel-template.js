const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Create separate Excel files for each API endpoint with parameter-specific columns
 * Based on actual API definitions from *.api files
 */
function createEndpointSpecificTemplates(templateDir) {
  console.log('Analyzing API files to create individual templates...');

  // Get all API definitions
  const apiDefinitions = analyzeAPIFiles();
  console.log(
    `Found ${Object.keys(apiDefinitions).length} unique API endpoints`
  );

  // Create templates directory if it doesn't exist
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  // Generate Excel files for each API endpoint
  Object.keys(apiDefinitions).forEach((endpointKey) => {
    const apiDef = apiDefinitions[endpointKey];
    createTemplateForAPI(apiDef, endpointKey, templateDir);
  });

  console.log('\nTemplate generation complete!');
  console.log('Next steps:');
  console.log('1. Fill in test configurations in the Excel files');
  console.log('2. Yellow highlighted columns contain required parameters');
  console.log('3. Run tests with: npm test');
}

/**
 * Analyze all .api files to extract endpoint definitions and parameters
 */
function analyzeAPIFiles() {
  const apiDir = path.resolve(__dirname, '../../src/main/ml-modules/root/ds');
  const endpoints = {};

  function findApiFiles(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        findApiFiles(fullPath);
      } else if (file.endsWith('.api')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const apiDef = JSON.parse(content);

          // Extract relative path for endpoint identification
          const relativePath = path.relative(apiDir, fullPath);
          const endpointKey = getEndpointKey(relativePath, apiDef.functionName);

          // Parse parameters
          const requiredParams = [];
          const optionalParams = [];

          if (apiDef.params) {
            apiDef.params.forEach((param) => {
              const paramInfo = {
                name: param.name,
                datatype: param.datatype,
                nullable: param.nullable,
              };

              if (param.nullable === true) {
                optionalParams.push(paramInfo);
              } else {
                requiredParams.push(paramInfo);
              }
            });
          }

          endpoints[endpointKey] = {
            functionName: apiDef.functionName,
            filePath: relativePath,
            requiredParams,
            optionalParams,
            allParams: [...requiredParams, ...optionalParams],
          };
        } catch (error) {
          console.warn(
            `Warning: Could not parse ${fullPath}: ${error.message}`
          );
        }
      }
    }
  }

  findApiFiles(apiDir);
  return endpoints;
}

/**
 * Generate endpoint key from file path and function name
 */
function getEndpointKey(filePath, functionName) {
  // Convert path like "ds/lux/document/create.api" to "document-create"
  const pathParts = filePath.split(path.sep);
  const filename = pathParts[pathParts.length - 1].replace('.api', '');

  if (pathParts.includes('document')) {
    return `document-${filename}`;
  } else if (pathParts.includes('tenantStatus')) {
    return `tenant-status-${filename}`;
  } else {
    // For files directly in ds/lux/, use the filename
    return filename;
  }
}

/**
 * Create template for a specific API endpoint
 */
function createTemplateForAPI(apiDef, endpointKey, templateDir) {
  const filename = `${endpointKey}-endpoint.xlsx`;
  const filePath = path.join(templateDir, filename);

  console.log(`Creating template for ${endpointKey}: ${filename}`);

  // Build columns array
  const baseColumns = [
    'test_name',
    'description',
    'enabled',
    'expected_status',
    'timeout_ms',
    'max_response_time',
    'delay_after_ms',
    'tags',
  ];

  // Add required parameters first (will be highlighted)
  const requiredParamColumns = apiDef.requiredParams.map(
    (param) => `param:${param.name}`
  );

  // Add optional parameters after required ones
  const optionalParamColumns = apiDef.optionalParams.map(
    (param) => `param:${param.name}`
  );

  const columns = [
    ...baseColumns,
    ...requiredParamColumns,
    ...optionalParamColumns,
  ];

  // Generate sample data
  const sampleData = generateSampleData(apiDef, endpointKey, columns);

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([columns, ...sampleData]);

  // Apply styling to required parameter columns (light yellow background)
  if (requiredParamColumns.length > 0) {
    requiredParamColumns.forEach((requiredParam) => {
      const colIndex = columns.indexOf(requiredParam);
      if (colIndex !== -1) {
        // Convert column index to Excel column letter
        const colLetter = XLSX.utils.encode_col(colIndex);

        // Apply yellow background to header cell
        const headerCell = ws[colLetter + '1'];
        if (headerCell) {
          if (!headerCell.s) headerCell.s = {};
          headerCell.s.fill = {
            fgColor: { rgb: 'FFFF99' }, // Light yellow
          };
        }
      }
    });
  }

  // Set column widths for better readability
  const colWidths = columns.map((col) => ({
    width: col.startsWith('param:')
      ? 20
      : col === 'description'
      ? 30
      : col === 'test_name'
      ? 25
      : 15,
  }));
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, endpointKey);

  // Add documentation sheet
  const docWs = createDocumentationSheetForAPI(
    apiDef,
    endpointKey,
    columns,
    requiredParamColumns
  );
  XLSX.utils.book_append_sheet(wb, docWs, 'Documentation');

  // Write the file
  XLSX.writeFile(wb, filePath);
  console.log(`✓ Created ${filePath}`);
}

/**
 * Generate sample test data for an API endpoint
 */
function generateSampleData(apiDef, endpointKey, columns) {
  const sampleRows = [];

  // Generate 2-3 sample test cases per endpoint
  const testCases = getSampleTestCases(apiDef, endpointKey);

  testCases.forEach((testCase, index) => {
    const row = [];

    columns.forEach((col) => {
      if (col === 'test_name') {
        row.push(testCase.name);
      } else if (col === 'description') {
        row.push(testCase.description);
      } else if (col === 'enabled') {
        row.push('true');
      } else if (col === 'expected_status') {
        row.push(testCase.expectedStatus || 200);
      } else if (col === 'timeout_ms') {
        row.push(10000);
      } else if (col === 'max_response_time') {
        row.push(testCase.maxResponseTime || 3000);
      } else if (col === 'delay_after_ms') {
        row.push(500);
      } else if (col === 'tags') {
        row.push(testCase.tags || `${endpointKey},functional`);
      } else if (col.startsWith('param:')) {
        const paramName = col.replace('param:', '');
        row.push(testCase.params[paramName] || '');
      } else {
        row.push('');
      }
    });

    sampleRows.push(row);
  });

  return sampleRows;
}

/**
 * Get sample test cases for an endpoint
 */
function getSampleTestCases(apiDef, endpointKey) {
  // Base test case structure
  const baseCase = {
    name: `${endpointKey} - Basic Test`,
    description: `Test ${apiDef.functionName} endpoint with valid parameters`,
    expectedStatus: 200,
    maxResponseTime: 3000,
    tags: `${endpointKey},functional`,
    params: {},
  };

  // Generate sample parameter values based on endpoint type and parameter names
  apiDef.allParams.forEach((param) => {
    baseCase.params[param.name] = getSampleParamValue(param, endpointKey);
  });

  // Create variations for different test scenarios
  const testCases = [baseCase];

  // Add error test case if there are required parameters
  if (apiDef.requiredParams.length > 0) {
    const errorCase = {
      ...baseCase,
      name: `${endpointKey} - Missing Required Param`,
      description: `Test ${apiDef.functionName} with missing required parameters`,
      expectedStatus: 400,
      maxResponseTime: 2000,
      tags: `${endpointKey},validation`,
      params: { ...baseCase.params },
    };

    // Remove first required parameter to trigger error
    const firstRequired = apiDef.requiredParams[0];
    if (firstRequired) {
      errorCase.params[firstRequired.name] = '';
    }

    testCases.push(errorCase);
  }

  return testCases;
}

/**
 * Generate sample parameter values based on parameter name and type
 */
function getSampleParamValue(param, endpointKey) {
  const paramName = param.name.toLowerCase();

  // Common parameter patterns
  if (paramName === 'unitname') return '';
  if (paramName === 'q')
    return endpointKey.includes('search')
      ? 'test query'
      : '{"query": "example"}';
  if (paramName === 'scope') return 'work';
  if (paramName === 'uri')
    return 'https://lux.collections.yale.edu/data/test/example';
  if (paramName === 'page') return '1';
  if (paramName === 'pagelength') return '20';
  if (paramName === 'lang') return 'en';
  if (paramName === 'profile') return 'summary';
  if (paramName === 'doc')
    return '{"@context": "https://linked.art/contexts/base.json", "type": "HumanMadeObject"}';
  if (paramName === 'text') return 'sample text';
  if (paramName === 'context') return 'person';
  if (paramName === 'name') return 'classification';

  // Default values based on data type
  if (param.datatype === 'string') return 'example';
  if (param.datatype === 'int' || param.datatype === 'integer') return '1';
  if (param.datatype === 'boolean') return 'true';
  if (param.datatype === 'jsonDocument') return '{}';

  return '';
}

/**
 * Create documentation sheet for a specific API endpoint
 */
function createDocumentationSheetForAPI(
  apiDef,
  endpointKey,
  columns,
  requiredParamColumns
) {
  const docData = [
    [`LUX Endpoint Testing Framework - ${endpointKey.toUpperCase()}`],
    [''],
    ['API Function:', apiDef.functionName],
    ['File Path:', apiDef.filePath],
    [''],
    ['Column Descriptions:'],
    ['test_name', 'Unique identifier for the test'],
    ['description', 'Human-readable description of what the test does'],
    ['enabled', 'Whether to run this test (true/false)'],
    ['expected_status', 'Expected HTTP status code (200, 404, etc.)'],
    ['timeout_ms', 'Request timeout in milliseconds'],
    ['max_response_time', 'Maximum acceptable response time in ms'],
    ['delay_after_ms', 'Delay after test completion in ms'],
    ['tags', 'Comma-separated tags for filtering tests'],
    [''],
  ];

  // Add parameter documentation
  if (apiDef.allParams.length > 0) {
    docData.push(['Parameter Descriptions:']);

    apiDef.allParams.forEach((param) => {
      const paramCol = `param:${param.name}`;
      const isRequired = requiredParamColumns.includes(paramCol);
      const description = getParameterDescription(param.name, param.datatype);
      docData.push([
        paramCol,
        `${description} (${param.datatype})${
          isRequired ? ' (REQUIRED - highlighted in yellow)' : ' (optional)'
        }`,
      ]);
    });
  }

  // Add endpoint-specific notes
  docData.push([''], ['Endpoint-Specific Notes:']);
  const endpointNotes = getEndpointNotes(endpointKey, apiDef);
  endpointNotes.forEach((note) => docData.push([note]));

  return XLSX.utils.aoa_to_sheet(docData);
}

/**
 * Get parameter descriptions based on parameter name and type
 */
function getParameterDescription(paramName, datatype) {
  const name = paramName.toLowerCase();

  const descriptions = {
    unitname: 'Unit name for multi-tenant deployments',
    q: 'Search query (string or JSON object)',
    scope: 'Search scope (work, person, place, concept, event, etc.)',
    page: 'Page number for pagination (1-based)',
    pagelength: 'Number of results per page',
    sort: 'Sort order for results',
    uri: 'URI of the resource',
    doc: 'JSON document for create/update operations',
    profile: 'Response profile (summary, full, etc.)',
    lang: 'Language code (en, es, fr, etc.)',
    text: 'Text to auto-complete or process',
    context: 'Context for auto-completion (person, place, concept, etc.)',
    name: 'Name parameter (varies by endpoint)',
  };

  return descriptions[name] || `${paramName} parameter`;
}

/**
 * Get endpoint-specific notes and tips
 */
function getEndpointNotes(endpointKey, apiDef) {
  const notes = [`• Function: ${apiDef.functionName}`];

  if (apiDef.requiredParams.length > 0) {
    notes.push(
      `• Required parameters: ${apiDef.requiredParams
        .map((p) => p.name)
        .join(', ')}`
    );
  }

  if (apiDef.optionalParams.length > 0) {
    notes.push(
      `• Optional parameters: ${apiDef.optionalParams
        .map((p) => p.name)
        .join(', ')}`
    );
  }

  // Add specific notes based on endpoint type
  if (endpointKey.includes('document')) {
    notes.push(
      '• Document operations may require different parameters based on the operation type'
    );
  }

  if (endpointKey.includes('search')) {
    notes.push('• Search queries can be strings or complex JSON objects');
  }

  return notes;
}

// Run the template creation if this script is executed directly
if (require.main === module) {
  const templateDir = path.join(__dirname, 'templates');
  createEndpointSpecificTemplates(templateDir);
}

module.exports = { createEndpointSpecificTemplates };
