const XLSX = require('xlsx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class EndpointTester {
  constructor(configDir, outputDir = './test-reports') {
    this.configDir = configDir;
    this.outputDir = outputDir;
    this.results = [];
    this.baseUrl = process.env.BASE_URL || 'http://localhost:8003';
    this.defaultAuth =
      process.env.DEFAULT_AUTH ||
      'Basic bHV4LWVuZHBvaW50LWNvbnN1bWVyOmVuZHBvaW50';

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Discover and load all endpoint configuration files
   */
  loadAllEndpointConfigs() {
    const configs = [];
    const files = fs
      .readdirSync(this.configDir)
      .filter((file) => file.endsWith('.xlsx') || file.endsWith('.csv'))
      .filter((file) => !file.includes('template')); // Skip template files

    for (const file of files) {
      const filePath = path.join(this.configDir, file);
      const endpointType = this.extractEndpointType(file);

      console.log(`Loading config for ${endpointType} from ${file}`);

      try {
        const testConfigs = this.loadTestConfig(filePath, endpointType);
        configs.push(...testConfigs);
      } catch (error) {
        console.error(`Error loading ${file}: ${error.message}`);
      }
    }

    return configs;
  }

  /**
   * Extract endpoint type from filename
   */
  extractEndpointType(filename) {
    // Extract endpoint type from filename like "search-tests.xlsx" -> "search"
    const baseName = path.basename(filename, path.extname(filename));
    return baseName.replace(/-tests?$/, '').replace(/_tests?$/, '');
  }

  /**
   * Load test configuration from Excel/CSV file
   */
  loadTestConfig(filePath, endpointType) {
    let data;

    if (filePath.endsWith('.xlsx')) {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      // CSV handling
      const csvContent = fs.readFileSync(filePath, 'utf8');
      data = this.parseCSV(csvContent);
    }

    // Transform data into standardized test configurations
    return data.map((row) =>
      this.transformRowToTestConfig(row, endpointType, filePath)
    );
  }

  /**
   * Transform a spreadsheet row into a standardized test configuration
   */
  transformRowToTestConfig(row, endpointType, sourceFile) {
    // Extract base configuration
    const testConfig = {
      test_name: row.test_name || `${endpointType}_test_${Date.now()}`,
      endpoint_type: endpointType,
      source_file: path.basename(sourceFile),
      method: row.method || this.getDefaultMethod(endpointType),
      base_endpoint: row.base_endpoint || this.getDefaultEndpoint(endpointType),
      expected_status: parseInt(row.expected_status) || 200,
      timeout_ms: parseInt(row.timeout_ms) || 10000,
      max_response_time: parseInt(row.max_response_time) || 5000,
      delay_after_ms: parseInt(row.delay_after_ms) || 0,
      enabled: row.enabled === 'true' || row.enabled === true,
      description: row.description || '',
      tags: row.tags ? row.tags.split(',').map((t) => t.trim()) : [],
      auth_override: row.auth_override || null,
      parameters: {},
    };

    // Extract all param: columns
    Object.keys(row).forEach((key) => {
      if (key.startsWith('param:')) {
        const paramName = key.substring(6); // Remove 'param:' prefix
        const paramValue = row[key];
        if (
          paramValue !== undefined &&
          paramValue !== null &&
          paramValue !== ''
        ) {
          testConfig.parameters[paramName] = paramValue;
        }
      }
    });

    return testConfig;
  }

  /**
   * Get default HTTP method for endpoint type
   */
  getDefaultMethod(endpointType) {
    const methodMap = {
      search: 'GET',
      facets: 'GET',
      'related-list': 'GET',
      'search-estimate': 'GET',
      'search-will-match': 'GET',
      'advanced-search-config': 'GET',
      'search-info': 'GET',
      translate: 'POST',
      'document-create': 'POST',
      'document-read': 'GET',
      'document-update': 'PUT',
      'document-delete': 'DELETE',
    };

    return methodMap[endpointType] || 'GET';
  }

  /**
   * Get default endpoint path for endpoint type
   */
  getDefaultEndpoint(endpointType) {
    const endpointMap = {
      search: '/ds/lux/search.mjs',
      facets: '/ds/lux/facets.mjs',
      'related-list': '/ds/lux/related-list',
      'search-estimate': '/ds/lux/searchEstimate.mjs',
      'search-will-match': '/ds/lux/searchWillMatch.mjs',
      'advanced-search-config': '/ds/lux/advancedSearchConfig.mjs',
      'search-info': '/ds/lux/searchInfo.mjs',
      translate: '/ds/lux/translate.mjs',
      'document-create': '/ds/lux/document/create.mjs',
      'document-read': '/ds/lux/document/read.mjs',
      'document-update': '/ds/lux/document/update.mjs',
      'document-delete': '/ds/lux/document/delete.mjs',
    };

    return endpointMap[endpointType] || '/';
  }

  /**
   * Build complete URL from test configuration
   */
  buildRequestUrl(testConfig) {
    let url = this.baseUrl + testConfig.base_endpoint;

    // Handle special cases for related-list endpoints
    if (
      testConfig.endpoint_type === 'related-list' &&
      testConfig.parameters.scope
    ) {
      url += `/${testConfig.parameters.scope}.mjs`;
    }

    // Build query parameters
    const queryParams = [];
    Object.entries(testConfig.parameters).forEach(([key, value]) => {
      // Skip parameters that are used in path or body
      if (
        this.isQueryParameter(key, testConfig.endpoint_type, testConfig.method)
      ) {
        queryParams.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        );
      }
    });

    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }

    return url;
  }

  /**
   * Determine if a parameter should be included in query string
   */
  isQueryParameter(paramName, endpointType, method) {
    // Parameters that go in the path, not query
    const pathParams = ['scope'];

    // Parameters that go in the body for POST/PUT requests
    const bodyParams = ['doc', 'unitName', 'lang', 'uri'];

    if (pathParams.includes(paramName)) {
      return false;
    }

    if (
      (method === 'POST' || method === 'PUT') &&
      bodyParams.includes(paramName)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Build request body from test configuration
   */
  buildRequestBody(testConfig) {
    if (testConfig.method === 'GET' || testConfig.method === 'DELETE') {
      return null;
    }

    // Handle different endpoint types
    switch (testConfig.endpoint_type) {
      case 'translate':
      case 'search':
        return this.buildJSONBody(testConfig);

      case 'document-create':
      case 'document-update':
        return this.buildFormDataBody(testConfig);

      default:
        return this.buildJSONBody(testConfig);
    }
  }

  /**
   * Build JSON request body
   */
  buildJSONBody(testConfig) {
    const body = {};

    // Add relevant parameters to JSON body
    Object.entries(testConfig.parameters).forEach(([key, value]) => {
      if (this.isBodyParameter(key, testConfig.endpoint_type, 'json')) {
        body[key] = this.parseParameterValue(value);
      }
    });

    return Object.keys(body).length > 0 ? JSON.stringify(body) : null;
  }

  /**
   * Build form data request body
   */
  buildFormDataBody(testConfig) {
    const formData = new URLSearchParams();

    Object.entries(testConfig.parameters).forEach(([key, value]) => {
      if (this.isBodyParameter(key, testConfig.endpoint_type, 'formdata')) {
        formData.append(key, value);
      }
    });

    return formData.toString();
  }

  /**
   * Determine if parameter should be in request body
   */
  isBodyParameter(paramName, endpointType, bodyType) {
    const jsonBodyParams = [
      'q',
      'scope',
      'page',
      'pageLength',
      'sort',
      'facets',
    ];
    const formDataBodyParams = ['doc', 'unitName', 'lang', 'uri'];

    if (bodyType === 'json') {
      return jsonBodyParams.includes(paramName);
    } else if (bodyType === 'formdata') {
      return formDataBodyParams.includes(paramName);
    }

    return false;
  }

  /**
   * Parse parameter value (handle JSON strings, arrays, etc.)
   */
  parseParameterValue(value) {
    if (typeof value === 'string') {
      // Try to parse as JSON if it looks like JSON
      if (
        (value.startsWith('{') && value.endsWith('}')) ||
        (value.startsWith('[') && value.endsWith(']'))
      ) {
        try {
          return JSON.parse(value);
        } catch (e) {
          // If parsing fails, return as string
          return value;
        }
      }

      // Handle comma-separated arrays
      if (value.includes(',') && !value.includes(' ')) {
        return value.split(',');
      }
    }

    return value;
  }

  /**
   * Run a single test configuration
   */
  async runSingleTest(testConfig) {
    const startTime = Date.now();

    try {
      // Build the HTTP request
      const url = this.buildRequestUrl(testConfig);
      const body = this.buildRequestBody(testConfig);
      const headers = this.buildRequestHeaders(testConfig);

      const requestConfig = {
        method: testConfig.method,
        url: url,
        headers: headers,
        timeout: testConfig.timeout_ms,
        ...(body && { data: body }),
      };

      console.log(`Running test: ${testConfig.test_name}`);
      console.log(`  URL: ${url}`);
      console.log(`  Method: ${testConfig.method}`);

      // Make the HTTP request
      const response = await axios(requestConfig);
      const duration = Date.now() - startTime;

      const result = {
        test_name: testConfig.test_name,
        endpoint_type: testConfig.endpoint_type,
        source_file: testConfig.source_file,
        status: 'PASS',
        expected_status: testConfig.expected_status,
        actual_status: response.status,
        duration_ms: duration,
        response_time_ms: duration,
        response_size_bytes: JSON.stringify(response.data).length,
        url: url,
        method: testConfig.method,
        parameters: testConfig.parameters,
        timestamp: new Date().toISOString(),
        tags: testConfig.tags,
      };

      // Check if response time is acceptable
      if (
        testConfig.max_response_time &&
        duration > testConfig.max_response_time
      ) {
        result.status = 'SLOW';
        result.warning = `Response time ${duration}ms exceeded threshold ${testConfig.max_response_time}ms`;
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result = {
        test_name: testConfig.test_name,
        endpoint_type: testConfig.endpoint_type,
        source_file: testConfig.source_file,
        status: 'FAIL',
        expected_status: testConfig.expected_status,
        actual_status: error.response?.status || 'ERROR',
        duration_ms: duration,
        error_message: error.message,
        url: this.buildRequestUrl(testConfig),
        method: testConfig.method,
        parameters: testConfig.parameters,
        timestamp: new Date().toISOString(),
        tags: testConfig.tags,
      };

      return result;
    }
  }

  /**
   * Build request headers
   */
  buildRequestHeaders(testConfig) {
    const headers = {
      'User-Agent': 'LUX-Endpoint-Tester/1.0',
    };

    // Add authentication
    const auth = testConfig.auth_override || this.defaultAuth;
    if (auth) {
      headers['Authorization'] = auth;
    }

    // Add content-type based on request body type
    if (testConfig.method === 'POST' || testConfig.method === 'PUT') {
      switch (testConfig.endpoint_type) {
        case 'document-create':
        case 'document-update':
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          break;
        default:
          headers['Content-Type'] = 'application/json';
      }
    }

    return headers;
  }

  /**
   * Parse CSV content (simple implementation)
   */
  parseCSV(csvContent) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i]
          .split(',')
          .map((v) => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }

    return data;
  }

  /**
   * Run all tests from all configuration files
   */
  async runAllTests() {
    console.log('Discovering endpoint configuration files...');
    const testConfigs = this.loadAllEndpointConfigs();

    console.log(
      `Found ${testConfigs.length} test configurations across ${
        testConfigs.reduce((acc, t) => {
          if (!acc.includes(t.source_file)) acc.push(t.source_file);
          return acc;
        }, []).length
      } files`
    );

    // Group tests by endpoint type for reporting
    const testsByType = {};
    testConfigs.forEach((config) => {
      if (!testsByType[config.endpoint_type]) {
        testsByType[config.endpoint_type] = [];
      }
      testsByType[config.endpoint_type].push(config);
    });

    console.log('\nTest distribution by endpoint type:');
    Object.entries(testsByType).forEach(([type, tests]) => {
      console.log(`  ${type}: ${tests.length} tests`);
    });

    // Run tests
    for (const testConfig of testConfigs) {
      if (!testConfig.enabled) {
        console.log(`Skipping disabled test: ${testConfig.test_name}`);
        continue;
      }

      const result = await this.runSingleTest(testConfig);
      this.results.push(result);

      // Optional delay between tests
      if (testConfig.delay_after_ms > 0) {
        console.log(`  Waiting ${testConfig.delay_after_ms}ms...`);
        await new Promise((resolve) =>
          setTimeout(resolve, testConfig.delay_after_ms)
        );
      }
    }

    this.generateReport();
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(
      this.outputDir,
      `endpoint-test-report-${timestamp}.json`
    );
    const csvFile = path.join(
      this.outputDir,
      `endpoint-test-report-${timestamp}.csv`
    );
    const htmlFile = path.join(
      this.outputDir,
      `endpoint-test-report-${timestamp}.html`
    );

    // JSON Report
    const report = {
      summary: {
        total_tests: this.results.length,
        passed: this.results.filter((r) => r.status === 'PASS').length,
        failed: this.results.filter((r) => r.status === 'FAIL').length,
        errors: this.results.filter((r) => r.status === 'ERROR').length,
        slow: this.results.filter((r) => r.status === 'SLOW').length,
        average_duration:
          this.results.reduce((sum, r) => sum + (r.duration_ms || 0), 0) /
          this.results.length,
        total_duration: this.results.reduce(
          (sum, r) => sum + (r.duration_ms || 0),
          0
        ),
        tests_by_endpoint_type: this.getTestsByEndpointType(),
        timestamp: new Date().toISOString(),
      },
      results: this.results,
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // CSV Report
    if (this.results.length > 0) {
      const csvContent = this.convertToCSV(this.results);
      fs.writeFileSync(csvFile, csvContent);
    }

    // HTML Report
    const htmlContent = this.generateHTMLReport(report);
    fs.writeFileSync(htmlFile, htmlContent);

    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${report.summary.total_tests}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Errors: ${report.summary.errors}`);
    console.log(`Slow: ${report.summary.slow}`);
    console.log(
      `Average Duration: ${Math.round(report.summary.average_duration)}ms`
    );
    console.log(
      `Total Duration: ${Math.round(report.summary.total_duration)}ms`
    );
    console.log(`\nReports generated:`);
    console.log(`- JSON: ${reportFile}`);
    console.log(`- CSV: ${csvFile}`);
    console.log(`- HTML: ${htmlFile}`);
  }

  /**
   * Get test counts by endpoint type for summary
   */
  getTestsByEndpointType() {
    const summary = {};
    this.results.forEach((result) => {
      const type = result.endpoint_type;
      if (!summary[type]) {
        summary[type] = { total: 0, passed: 0, failed: 0, errors: 0, slow: 0 };
      }
      summary[type].total++;

      switch (result.status) {
        case 'PASS':
          summary[type].passed++;
          break;
        case 'FAIL':
          summary[type].failed++;
          break;
        case 'ERROR':
          summary[type].errors++;
          break;
        case 'SLOW':
          summary[type].slow++;
          break;
      }
    });
    return summary;
  }

  /**
   * Convert results to CSV format
   */
  convertToCSV(results) {
    if (results.length === 0) return '';

    const headers = Object.keys(results[0]).join(',');
    const rows = results.map((result) =>
      Object.values(result)
        .map((value) => {
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return typeof value === 'string'
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(',')
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    const endpointTypeSummary = Object.entries(
      report.summary.tests_by_endpoint_type
    )
      .map(
        ([type, stats]) =>
          `<tr>
          <td>${type}</td>
          <td>${stats.total}</td>
          <td class="pass">${stats.passed}</td>
          <td class="fail">${stats.failed}</td>
          <td class="error">${stats.errors}</td>
          <td class="slow">${stats.slow}</td>
        </tr>`
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <title>LUX Endpoint Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .pass { color: green; }
        .fail { color: red; }
        .error { color: orange; }
        .slow { color: blue; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .status-PASS { background-color: #d4edda; }
        .status-FAIL { background-color: #f8d7da; }
        .status-ERROR { background-color: #fff3cd; }
        .status-SLOW { background-color: #d1ecf1; }
        .parameters { font-size: 0.8em; color: #666; }
    </style>
</head>
<body>
    <h1>LUX Endpoint Test Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Generated:</strong> ${report.summary.timestamp}</p>
        <p><strong>Total Tests:</strong> ${report.summary.total_tests}</p>
        <p><strong>Passed:</strong> <span class="pass">${
          report.summary.passed
        }</span></p>
        <p><strong>Failed:</strong> <span class="fail">${
          report.summary.failed
        }</span></p>
        <p><strong>Errors:</strong> <span class="error">${
          report.summary.errors
        }</span></p>
        <p><strong>Slow:</strong> <span class="slow">${
          report.summary.slow
        }</span></p>
        <p><strong>Average Duration:</strong> ${Math.round(
          report.summary.average_duration
        )}ms</p>
        <p><strong>Total Duration:</strong> ${Math.round(
          report.summary.total_duration
        )}ms</p>
    </div>

    <h2>Tests by Endpoint Type</h2>
    <table>
        <thead>
            <tr>
                <th>Endpoint Type</th>
                <th>Total</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Errors</th>
                <th>Slow</th>
            </tr>
        </thead>
        <tbody>
            ${endpointTypeSummary}
        </tbody>
    </table>

    <h2>Individual Test Results</h2>
    <table>
        <thead>
            <tr>
                <th>Test Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>Duration (ms)</th>
                <th>Parameters</th>
                <th>Timestamp</th>
            </tr>
        </thead>
        <tbody>
            ${report.results
              .map(
                (result) => `
                <tr class="status-${result.status}">
                    <td>${result.test_name}</td>
                    <td>${result.endpoint_type}</td>
                    <td>${result.status}</td>
                    <td>${result.expected_status}</td>
                    <td>${result.actual_status}</td>
                    <td>${result.duration_ms || 'N/A'}</td>
                    <td class="parameters">${JSON.stringify(
                      result.parameters || {}
                    )}</td>
                    <td>${result.timestamp}</td>
                </tr>
            `
              )
              .join('')}
        </tbody>
    </table>
</body>
</html>`;
  }
}

// CLI Interface
if (require.main === module) {
  const configDir = process.argv[2] || './configs';
  const outputDir = process.argv[3] || './test-reports';

  if (!fs.existsSync(configDir)) {
    console.error(`Configuration directory not found: ${configDir}`);
    console.log(
      'Usage: node endpoint-test-runner.js <config-directory> [output-dir]'
    );
    process.exit(1);
  }

  const tester = new EndpointTester(configDir, outputDir);
  tester.runAllTests().catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = EndpointTester;
