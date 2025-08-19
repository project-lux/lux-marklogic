const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Create separate Excel files for each endpoint type with parameter-specific columns
 */
function createEndpointSpecificTemplates(templateDir) {
  const templates = {
    search: {
      columns: [
        'test_name',
        'description',
        'enabled',
        'expected_status',
        'timeout_ms',
        'max_response_time',
        'delay_after_ms',
        'tags',
        'param:q',
        'param:scope',
        'param:page',
        'param:pageLength',
        'param:sort',
      ],
      sampleData: [
        [
          'Search - Basic Query',
          'Basic search for works',
          'true',
          200,
          10000,
          3000,
          500,
          'search,functional',
          'mona lisa',
          'work',
          1,
          10,
          '',
        ],
        [
          'Search - Advanced Query',
          'Search with pagination',
          'true',
          200,
          10000,
          3000,
          500,
          'search,pagination',
          'painting',
          'work',
          2,
          20,
          'title_desc',
        ],
        [
          'Search - Empty Query',
          'Search with empty query',
          'true',
          200,
          10000,
          3000,
          0,
          'search,edge-case',
          '',
          'work',
          1,
          10,
          '',
        ],
      ],
    },

    facets: {
      columns: [
        'test_name',
        'description',
        'enabled',
        'expected_status',
        'timeout_ms',
        'max_response_time',
        'delay_after_ms',
        'tags',
        'param:name',
        'param:q',
        'param:scope',
        'param:page',
        'param:pageLength',
      ],
      sampleData: [
        [
          'Facets - Work Creation Place',
          'Get facets for work creation places',
          'true',
          200,
          10000,
          3000,
          500,
          'facets,functional',
          'workCreationPlaceId',
          'mona lisa',
          'work',
          1,
          10,
        ],
        [
          'Facets - Agent Classification',
          'Get facets for agent classification',
          'true',
          200,
          10000,
          3000,
          500,
          'facets,functional',
          'agentClassificationId',
          'artist',
          'agent',
          1,
          20,
        ],
        [
          'Facets - Material Type',
          'Get facets for material types',
          'true',
          200,
          10000,
          3000,
          0,
          'facets,material',
          'materialId',
          'oil',
          'work',
          1,
          15,
        ],
      ],
    },

    'related-list': {
      columns: [
        'test_name',
        'description',
        'enabled',
        'expected_status',
        'timeout_ms',
        'max_response_time',
        'delay_after_ms',
        'tags',
        'param:scope',
        'param:name',
        'param:uri',
        'param:page',
        'param:pageLength',
      ],
      sampleData: [
        [
          'Related - Works by Agent',
          'Get works created by specific agent',
          'true',
          200,
          10000,
          3000,
          500,
          'related,functional',
          'work',
          'relatedToAgent',
          'https://lux.collections.yale.edu/data/person/12345',
          1,
          10,
        ],
        [
          'Related - Objects at Location',
          'Get objects at specific location',
          'true',
          200,
          10000,
          3000,
          500,
          'related,functional',
          'object',
          'relatedToPlace',
          'https://lux.collections.yale.edu/data/place/67890',
          1,
          20,
        ],
        [
          'Related - Events for Agent',
          'Get events related to agent',
          'true',
          200,
          10000,
          3000,
          0,
          'related,events',
          'event',
          'relatedToAgent',
          'https://lux.collections.yale.edu/data/person/54321',
          1,
          15,
        ],
      ],
    },

    'search-estimate': {
      columns: [
        'test_name',
        'description',
        'enabled',
        'expected_status',
        'timeout_ms',
        'max_response_time',
        'delay_after_ms',
        'tags',
        'param:q',
        'param:scope',
      ],
      sampleData: [
        [
          'Estimate - Work Search',
          'Estimate results for work search',
          'true',
          200,
          5000,
          2000,
          300,
          'estimate,functional',
          'art',
          'work',
        ],
        [
          'Estimate - Object Search',
          'Estimate results for object search',
          'true',
          200,
          5000,
          2000,
          300,
          'estimate,functional',
          'sculpture',
          'object',
        ],
        [
          'Estimate - Large Result Set',
          'Estimate for query with many results',
          'true',
          200,
          8000,
          3000,
          0,
          'estimate,performance',
          'a',
          'work',
        ],
      ],
    },

    'search-will-match': {
      columns: [
        'test_name',
        'description',
        'enabled',
        'expected_status',
        'timeout_ms',
        'max_response_time',
        'delay_after_ms',
        'tags',
        'param:q',
        'param:scope',
      ],
      sampleData: [
        [
          'Will Match - Painting Query',
          'Check if painting query will match',
          'true',
          200,
          5000,
          2000,
          300,
          'validation,functional',
          'painting',
          'work',
        ],
        [
          'Will Match - Specific Artist',
          'Check if specific artist query matches',
          'true',
          200,
          5000,
          2000,
          300,
          'validation,functional',
          'Picasso',
          'agent',
        ],
        [
          'Will Match - No Results',
          'Query that should return no results',
          'true',
          200,
          5000,
          2000,
          0,
          'validation,negative',
          'zzznomatchzz',
          'work',
        ],
      ],
    },

    translate: {
      columns: [
        'test_name',
        'description',
        'enabled',
        'expected_status',
        'timeout_ms',
        'max_response_time',
        'delay_after_ms',
        'tags',
        'param:q',
        'param:scope',
      ],
      sampleData: [
        [
          'Translate - Boolean Query',
          'Translate boolean search query',
          'true',
          200,
          5000,
          2000,
          300,
          'translate,functional',
          'mona AND lisa',
          'work',
        ],
        [
          'Translate - Simple Query',
          'Translate simple keyword query',
          'true',
          200,
          5000,
          2000,
          300,
          'translate,functional',
          'impressionist',
          'work',
        ],
        [
          'Translate - Complex Query',
          'Translate complex search query',
          'true',
          200,
          8000,
          3000,
          0,
          'translate,complex',
          '(painting OR sculpture) AND NOT modern',
          'work',
        ],
      ],
    },

    'document-create': {
      columns: [
        'test_name',
        'description',
        'enabled',
        'expected_status',
        'timeout_ms',
        'max_response_time',
        'delay_after_ms',
        'tags',
        'param:unitName',
        'param:doc',
        'param:lang',
      ],
      sampleData: [
        [
          'Create - User Profile',
          'Create a user profile document',
          'false',
          200,
          15000,
          5000,
          1000,
          'document,create',
          'ypm',
          '{"type": "Person", "classified_as": [{"id": "https://todo.concept.user.profile"}]}',
          'en',
        ],
        [
          'Create - My Collection',
          'Create a My Collection document',
          'false',
          200,
          15000,
          5000,
          1000,
          'document,create',
          'ypm',
          '{"type": "Set", "identified_by": [{"type": "Name", "content": "Test Collection"}]}',
          'en',
        ],
        [
          'Create - Simple Document',
          'Create a simple test document',
          'false',
          200,
          15000,
          5000,
          1000,
          'document,create',
          'ypm',
          '{"type": "Test", "title": "Simple Test Doc"}',
          'en',
        ],
      ],
    },

    'document-read': {
      columns: [
        'test_name',
        'description',
        'enabled',
        'expected_status',
        'timeout_ms',
        'max_response_time',
        'delay_after_ms',
        'tags',
        'param:uri',
      ],
      sampleData: [
        [
          'Read - Test Document',
          'Read a specific test document',
          'false',
          200,
          5000,
          2000,
          300,
          'document,read',
          '/test-document.json',
        ],
        [
          'Read - User Profile',
          'Read user profile document',
          'false',
          200,
          5000,
          2000,
          300,
          'document,read',
          '/user-profiles/test-user.json',
        ],
        [
          'Read - Non-existent Doc',
          'Try to read non-existent document',
          'false',
          404,
          5000,
          2000,
          0,
          'document,negative',
          '/non-existent.json',
        ],
      ],
    },
  };

  // Create separate files for each endpoint type
  Object.entries(templates).forEach(([endpointType, template]) => {
    createSingleEndpointTemplate(endpointType, template, templateDir);
  });

  console.log('\nEndpoint-specific templates created:');
  Object.keys(templates).forEach((type) => {
    console.log(`  - ${type}-tests.xlsx`);
  });
}

/**
 * Create a single endpoint-specific template file
 */
function createSingleEndpointTemplate(endpointType, template, templateDir) {
  const workbook = XLSX.utils.book_new();

  // Create test data with headers
  const testData = [template.columns, ...template.sampleData];
  const testSheet = XLSX.utils.aoa_to_sheet(testData);

  // Set column widths
  testSheet['!cols'] = [
    { width: 30 }, // test_name
    { width: 50 }, // description
    { width: 10 }, // enabled
    { width: 15 }, // expected_status
    { width: 12 }, // timeout_ms
    { width: 18 }, // max_response_time
    { width: 15 }, // delay_after_ms
    { width: 25 }, // tags
    ...template.columns.slice(8).map(() => ({ width: 20 })), // parameter columns
  ];

  XLSX.utils.book_append_sheet(workbook, testSheet, 'Tests');

  // Add documentation sheet
  const docData = [
    ['Column', 'Description', 'Example'],
    ['test_name', 'Unique name for the test', 'Search - Basic Query'],
    [
      'description',
      'Description of what the test does',
      'Basic search for works containing mona lisa',
    ],
    ['enabled', 'Whether to run this test (true/false)', 'true'],
    ['expected_status', 'Expected HTTP status code', '200'],
    ['timeout_ms', 'Request timeout in milliseconds', '10000'],
    ['max_response_time', 'Maximum acceptable response time', '3000'],
    ['delay_after_ms', 'Delay after test completion', '500'],
    ['tags', 'Comma-separated tags for grouping', 'search,functional,smoke'],
    ['', '', ''],
    ['Parameter Columns (param:*)', '', ''],
    ...getEndpointSpecificDocumentation(endpointType),
  ];

  const docSheet = XLSX.utils.aoa_to_sheet(docData);
  docSheet['!cols'] = [{ width: 25 }, { width: 60 }, { width: 40 }];

  XLSX.utils.book_append_sheet(workbook, docSheet, 'Documentation');

  // Write file
  const fileName = `${endpointType}-tests.xlsx`;
  console.info(`Creating template within ${templateDir}`);
  const outputPath = path.join(templateDir, fileName);
  XLSX.writeFile(workbook, outputPath);
}

/**
 * Get endpoint-specific parameter documentation
 */
function getEndpointSpecificDocumentation(endpointType) {
  const docs = {
    search: [
      ['param:q', 'Search query string', 'mona lisa'],
      [
        'param:scope',
        'Search scope (work, object, agent, place, event)',
        'work',
      ],
      ['param:page', 'Page number for pagination', '1'],
      ['param:pageLength', 'Number of results per page', '10'],
      ['param:sort', 'Sort order for results', 'title_asc'],
    ],
    facets: [
      ['param:name', 'Facet name identifier', 'workCreationPlaceId'],
      ['param:q', 'Query to filter facets', 'mona lisa'],
      ['param:scope', 'Search scope', 'work'],
      ['param:page', 'Page number', '1'],
      ['param:pageLength', 'Results per page', '10'],
    ],
    'related-list': [
      ['param:scope', 'Related item scope', 'work'],
      ['param:name', 'Relationship name', 'relatedToAgent'],
      [
        'param:uri',
        'URI of the related entity',
        'https://lux.collections.yale.edu/data/person/12345',
      ],
      ['param:page', 'Page number', '1'],
      ['param:pageLength', 'Results per page', '10'],
    ],
    'search-estimate': [
      ['param:q', 'Search query string', 'art'],
      ['param:scope', 'Search scope', 'work'],
    ],
    'search-will-match': [
      ['param:q', 'Search query string', 'painting'],
      ['param:scope', 'Search scope', 'work'],
    ],
    translate: [
      ['param:q', 'Query string to translate', 'mona AND lisa'],
      ['param:scope', 'Target scope for translation', 'work'],
    ],
    'document-create': [
      ['param:unitName', 'Unit name identifier', 'ypm'],
      ['param:doc', 'JSON document to create', '{"type": "Person"}'],
      ['param:lang', 'Language code', 'en'],
    ],
    'document-read': [
      ['param:uri', 'URI of document to read', '/test-document.json'],
    ],
  };

  return docs[endpointType] || [];
}

/**
 * Create a master configuration directory with all templates
 */
function createConfigDirectories() {
  const templateDir = path.join(__dirname, 'configsTemplates');
  const configDir = path.join(__dirname, 'configs');

  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir);
  }
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }

  createEndpointSpecificTemplates(templateDir);

  console.log(`\n Templates created within : ${templateDir}`);
  console.log('\nTo use these templates:');
  console.log(
    '1. Copy the template you would like to use into the configs/ directory'
  );
  console.log('2. Open the copied template');
  console.log('3. Modify the test data as needed');
  console.log('4. Save the request-specific test config file.');
  console.log('5. Run: node endpoint-test-runner.js configs/');
}

// Generate the templates
createConfigDirectories();

console.log('\nExample usage:');
console.log('# Run all tests from all endpoint configuration files');
console.log('node endpoint-test-runner.js configs/');
console.log('');
console.log('# Run tests with custom output directory');
console.log('node endpoint-test-runner.js configs/ my-test-reports/');
console.log('');
console.log('# Using PowerShell script');
console.log(
  '.\\run-endpoint-tests.ps1 -ConfigFile "configs" -OutputDir "reports"'
);
