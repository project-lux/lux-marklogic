# LUX Endpoint Testing Framework

A comprehensive, spreadsheet-driven endpoint testing framework for the LUX MarkLogic backend API. This tool allows you to configure test cases in Excel/CSV files, execute them sequentially or in parallel, and generate detailed reports with response times and status codes.

## Features

- **Spreadsheet-driven configuration**: Define tests in Excel (.xlsx) or CSV files
- **Comprehensive reporting**: JSON, CSV, and HTML reports with detailed metrics
- **Flexible authentication**: Support for Basic Auth, OAuth, and custom headers
- **Environment management**: Multiple environment configurations
- **Test organization**: Tag-based test filtering and test suite management
- **Performance monitoring**: Response time tracking and timeout handling
- **Error handling**: Detailed error reporting and negative test cases
- **Integration ready**: Works with existing Postman collections

## Quick Start

### 1. Install Dependencies

```powershell
cd scripts/endpointTesting
npm install
```

### 2. Configure Environment Variables

Set up the required environment variables for your target environment:

**Digest Authentication (default):**
```powershell
$env:BASE_URL = "http://localhost:8003"
$env:AUTH_TYPE = "digest"
$env:AUTH_USERNAME = "your-username"
$env:AUTH_PASSWORD = "your-password"
```

**For different environments:**
```powershell
# Development
$env:BASE_URL = "http://dev-server:8003"
$env:AUTH_TYPE = "digest"
$env:AUTH_USERNAME = "dev-user"
$env:AUTH_PASSWORD = "dev-password"

# Production  
$env:BASE_URL = "https://api.lux.yale.edu"
$env:AUTH_TYPE = "digest"
$env:AUTH_USERNAME = "prod-user"
$env:AUTH_PASSWORD = "secure-prod-password"
```

### 3. Create Configuration Templates

```powershell
npm run create-templates
```

This creates separate Excel files for each endpoint type in the `configs/` directory:
- `configs/search-endpoints.xlsx`
- `configs/facets-endpoints.xlsx` 
- `configs/related-list-endpoints.xlsx`
- `configs/translate-endpoints.xlsx`
- `configs/document-endpoints.xlsx`

### 4. Run Tests

**Using npm scripts (Recommended):**
```powershell
npm test
```

**Using Node.js directly:**
```powershell
node endpoint-test-runner.js ./configs
```

**With custom output directory:**
```powershell
node endpoint-test-runner.js ./configs ./test-reports
```

## Configuration

### Environment Variables

The framework uses the following environment variables:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `BASE_URL` | Base URL for the MarkLogic API | `http://localhost:8003` | `https://api.lux.yale.edu` |
| `AUTH_TYPE` | Authentication type | `digest` | `digest`, `oauth`, `none` |
| `AUTH_USERNAME` | Username for digest auth | `null` | `luxuser` |
| `AUTH_PASSWORD` | Password for digest auth | `null` | `luxpassword` |

**Setting Environment Variables:**

**PowerShell:**
```powershell
$env:BASE_URL = "http://localhost:8003"
$env:AUTH_TYPE = "digest"
$env:AUTH_USERNAME = "your-username"
$env:AUTH_PASSWORD = "your-password"
```

**Command Prompt:**
```cmd
set BASE_URL=http://localhost:8003
set AUTH_TYPE=digest
set AUTH_USERNAME=your-username
set AUTH_PASSWORD=your-password
```

**Linux/macOS:**
```bash
export BASE_URL="http://localhost:8003"
export AUTH_TYPE="digest"
export AUTH_USERNAME="your-username"
export AUTH_PASSWORD="your-password"
```

### Test Configuration Spreadsheet

The endpoint-specific configuration files contain the following columns:

#### Standard Columns (All Endpoint Types)

| Column | Description | Example | Required |
|--------|-------------|---------|----------|
| `test_name` | Unique test identifier | "Search - Basic Query" | Yes |
| `description` | Test description | "Basic search functionality" | No |
| `enabled` | Whether to run this test | true, false | Yes |
| `expected_status` | Expected HTTP status code | 200, 404, 401 | Yes |
| `timeout_ms` | Request timeout in milliseconds | 10000 | No |
| `max_response_time` | Max acceptable response time | 3000 | No |
| `delay_after_ms` | Delay after test completion | 500 | No |
| `tags` | Comma-separated tags | "search,functional,smoke" | No |

#### Parameter Columns (Endpoint-Specific)

Each endpoint type has specific `param:` columns for its parameters:

**Search Endpoints:**
- `param:q` - Search query
- `param:scope` - Search scope (work, person, place, etc.)
- `param:page` - Page number  
- `param:pageLength` - Results per page
- `param:sort` - Sort order

**Facets Endpoints:**
- `param:facetName` - Facet field name
- `param:q` - Search query
- `param:scope` - Search scope

**Related-List Endpoints:**
- `param:id` - Record ID
- `param:name` - Relationship name
- `param:page` - Page number
- `param:pageLength` - Results per page

## Authentication Configuration

Authentication is configured globally using environment variables and applies to all tests. The framework supports digest authentication by default, with the ability to configure different authentication types for future OAuth support.

```powershell
# Digest authentication (default)
$env:AUTH_TYPE = "digest"
$env:AUTH_USERNAME = "your-username"
$env:AUTH_PASSWORD = "your-password"
```

## Sample Test Configurations

### Basic GET Request
```csv
test_name,method,endpoint,headers,expected_status,enabled
"Health Check",GET,"/","Authorization: Basic bHV4LWVuZHBvaW50LWNvbnN1bWVyOmVuZHBvaW50",200,true
```

### POST Request with JSON Body
```csv
test_name,method,endpoint,headers,body,body_type,expected_status,enabled
"Advanced Search",POST,"/ds/lux/search.mjs","Authorization: Basic xyz; Content-Type: application/json","{\"q\": \"mona lisa\", \"scope\": \"work\"}",raw,200,true
```

### Form Data POST
```csv
test_name,method,endpoint,headers,body,body_type,expected_status,enabled
"Create Document",POST,"/ds/lux/document/create.mjs","Authorization: Basic xyz; Content-Type: multipart/form-data","unitName=ypm&doc={\"type\": \"Test\"}",formdata,200,true
```

### Negative Test Cases
```csv
test_name,method,endpoint,headers,expected_status,enabled
"Unauthorized Test",GET,"/ds/lux/search.mjs","",401,true
"Not Found Test",GET,"/ds/lux/nonexistent.mjs","Authorization: Basic xyz",404,true
```

## Reports

The framework generates three types of reports:

### 1. JSON Report
Detailed machine-readable results with full test data and summary statistics.

### 2. CSV Report  
Tabular format suitable for import into Excel or other analysis tools.

### 3. HTML Report
Human-readable report with:
- Test summary statistics
- Color-coded results (green=pass, red=fail, yellow=error)
- Response time analysis
- Individual test details

## Advanced Usage

### Running Specific Test Suites

Filter tests by tags:
```javascript
// In your test runner, filter by tags
const testConfigs = this.loadTestConfig()
  .filter(test => test.tags && test.tags.includes('smoke'));
```

### Performance Testing

Configure performance thresholds:
```csv
test_name,max_response_time,timeout_ms,tags
"Performance Test",1000,5000,"performance,load"
```

### Custom Authentication

Support for different authentication methods:
```csv
headers
"Authorization: Bearer jwt-token-here"
"X-API-Key: your-api-key"
"Authorization: Basic base64-encoded-credentials"
```

### Parallel Execution

Tests run sequentially by default for consistent results and easier debugging.

## Integration with Existing Tools

### Postman Integration
The framework can work alongside your existing Postman collections by:
1. Exporting Postman collections to Newman format
2. Converting test data to spreadsheet format
3. Running both approaches in parallel for validation

### CI/CD Integration

Example GitHub Actions workflow:
```yaml
- name: Run Endpoint Tests
  run: |
    cd scripts/endpointTesting
    npm install
    npm run create-templates
    npm test
    
- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: endpoint-test-reports
    path: scripts/endpointTesting/test-reports/
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**: 
   - Verify credentials in environment configuration
   - Check Base64 encoding for Basic auth
   - Ensure service accounts have proper permissions

2. **Timeout Issues**:
   - Increase `timeout_ms` for slow endpoints
   - Check network connectivity
   - Monitor MarkLogic server performance

3. **SSL/TLS Issues**:
   - For local testing, you may need to set `NODE_TLS_REJECT_UNAUTHORIZED=0`
   - Verify certificate configurations

### Debug Mode

Enable verbose logging:
```powershell
$env:DEBUG = "true"
npm test
```

Or set environment variable:
```powershell
$env:DEBUG = "true"
npm test
```

## Best Practices

1. **Test Organization**: Use tags to group related tests (smoke, functional, performance)
2. **Environment Management**: Maintain separate configurations for each environment
3. **Data Management**: Use realistic test data that doesn't impact production
4. **Error Handling**: Include negative test cases to verify error responses
5. **Performance Monitoring**: Set appropriate response time thresholds
6. **Documentation**: Keep test descriptions up-to-date and meaningful

## Sample Files

The framework includes several sample files:

- `configs/*.xlsx` - Endpoint-specific Excel configuration templates
- `endpoint-test-runner.js` - Main test execution engine  
- `create-excel-template.js` - Template generator
- `package.json` - Node.js dependencies

## Dependencies

- Node.js 16+ 
- newman (Postman command-line runner)
- axios (HTTP client)
- xlsx (Excel file processing)
- csv-parser (CSV processing)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the generated HTML reports for detailed error information
3. Check MarkLogic server logs for backend issues
4. Verify network connectivity and authentication

## License

This testing framework is part of the LUX project and follows the same licensing terms.
