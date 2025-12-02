#!/bin/bash
set -euo pipefail

# =============================================================================
# CONFIGURATION CONSTANTS
# =============================================================================

# MarkLogic cluster configuration.
readonly CLUSTER_NAME="Default"
readonly GROUP_NAME="Default"
readonly TOKEN_DURATION="PT15M"
readonly TOKEN_COMMENT="auto-scaling event"

# Port defaults
readonly DEFAULT_ADMIN_PORT=8001
readonly DEFAULT_MANAGE_PORT=8002

# Tools configuration
readonly CURL_EXEC="/usr/bin/curl"
readonly MARKLOGIC_ERROR_LOG="/var/opt/MarkLogic/Logs/ErrorLog.txt"

# =============================================================================
# JSON PARSING UTILITIES
# =============================================================================

# Extract JSON value using multiple fallback methods
# Usage: extract_json_value "$json_string" "key"
extract_json_value() {
    local json="$1"
    local key="$2"
    
    # Try jq first (most reliable)
    if command -v jq >/dev/null 2>&1; then
        echo "$json" | jq -r ".\"$key\"" 2>/dev/null || echo ""
        return
    fi
    
    # Try python as fallback
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "import json, sys; data=json.load(sys.stdin); print(data.get('$key', ''))" <<< "$json" 2>/dev/null || echo ""
        return
    fi
    
    # Fallback to grep/sed (fragile but better than before)
    echo "$json" | grep -o "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | sed "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/" 2>/dev/null || echo ""
}

# Check if JSON contains a specific value (for host verification)
# Usage: json_contains_value "$json_string" "value"
json_contains_value() {
    local json="$1"
    local value="$2"
    
    # Try jq first
    if command -v jq >/dev/null 2>&1; then
        echo "$json" | jq -e --arg val "$value" 'tostring | contains($val)' >/dev/null 2>&1
        return
    fi
    
    # Try python fallback
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "import json, sys; data=json.load(sys.stdin); print('$value' in str(data))" <<< "$json" 2>/dev/null | grep -q "True"
        return
    fi
    
    # Fallback to grep (last resort)
    echo "$json" | grep -q "$value"
}

# =============================================================================
# RUNTIME VARIABLES
# =============================================================================

# Error tracking for better visibility
ERROR_OCCURRED=false
ERROR_STEP=""
ERROR_MESSAGE=""
LAST_COMMAND=""

# Security cleanup tracking variables
DYNAMIC_HOSTS_ENABLED=false
API_TOKEN_AUTH_ENABLED=false
DYNAMIC_TOKEN=""

# Command line parameters (initialized in argument parsing)
DRY_RUN=false
VERBOSE=false
BOOTSTRAP_HOST=""
BOOTSTRAP_ADMIN_PORT=""
BOOTSTRAP_MANAGE_PORT=""
USERNAME=""
DYNAMIC_HOST=""
DYNAMIC_ADMIN_PORT=""
PASSWORD=""

# Ensure cleanup always runs on script exit
trap 'handle_exit' EXIT

#
# This script adds a dynamic host to a MarkLogic cluster by:
# 1. Temporarily enabling dynamic hosts and API token authentication on the bootstrap host
# 2. Generating a dynamic host token from the bootstrap node
# 3. Directly joining the dynamic host to the cluster using the token
# 4. Disabling dynamic hosts for security
# 5. Verifying the dynamic host was accepted by the cluster
#
# It can be run interactively or headless. If an error occurs and /var/opt/MarkLogic/Logs/ErrorLog.txt
# exists, the script appends an error message to it. This log should be monitored so a system
# administrator is notified. The unique string included is "Unable to add dynamic host".
#
# Password Options (in order of security, most secure first):
#
# 1. Interactive prompt (RECOMMENDED): Password will be prompted securely
#    Example: ./addDynamicHost.sh --bootstrap-host HOST --username USER --dynamic-host HOST
#
# 2. Environment variable: Set MARKLOGIC_PASSWORD before running the script
#    Example: export MARKLOGIC_PASSWORD=secret; ./addDynamicHost.sh ...
#    Or with sudo: sudo MARKLOGIC_PASSWORD=secret runuser -u daemon -- ./addDynamicHost.sh ...
#
# Prerequisites:
#
# - curl must be available in PATH
# - jq recommended for reliable JSON parsing (python3 used as fallback, grep/sed as last resort)
# - nc (netcat) recommended for connectivity checks (curl used as fallback)
# - python3 optional for JSON parsing and formatting (improves reliability)
# - The MarkLogic user must have admin privileges or appropriate dynamic host management roles
# - MarkLogic Server must be installed and running (but uninitialized) on the dynamic host
# - To write to ErrorLog.txt, the script's process owner must have write permissions to it.
#   (e.g., sudo runuser -u daemon bash addDynamicHost.sh ...)
#

cleanup_and_exit () {
    # Set error context if we're in a step and haven't already set an error
    if [ -n "${CURRENT_STEP:-}" ] && [ "$ERROR_OCCURRED" = false ]; then
        set_error "$1" "${LAST_COMMAND:-}"
    fi
    
    # Write error message to a monitored MarkLogic log file if it exists.
    if [ -f "$MARKLOGIC_ERROR_LOG" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') Unable to add dynamic host: $1" >> "$MARKLOGIC_ERROR_LOG"
    fi

    script=`basename "$0"`
    echo >&2 ""
    echo >&2 "$1"
    echo >&2 ""
    if [ "$2" = true ]; then
        echo >&2 "Usage: $script [--dry-run] [--verbose] --bootstrap-host HOST [--bootstrap-admin-port PORT] [--bootstrap-manage-port PORT] --username USER --dynamic-host HOST [--dynamic-admin-port PORT]"
        echo >&2 ""
        echo >&2 "Parameters:"
        echo >&2 "  --dry-run                     Preview actions without making changes"
        echo >&2 "  --verbose                     Show detailed request/response information"
        echo >&2 "  --bootstrap-host HOST         MarkLogic bootstrap server hostname/IP (existing cluster node)"
        echo >&2 "  --bootstrap-admin-port PORT   Bootstrap server admin port (default: 8001)"
        echo >&2 "  --bootstrap-manage-port PORT  Bootstrap server manage port (default: 8002)"
        echo >&2 "  --username USER               MarkLogic username"
        echo >&2 "  --dynamic-host HOST           Hostname/IP of the machine joining as dynamic host"
        echo >&2 "  --dynamic-admin-port PORT     Admin port for the joining host (default: 8001)"
        echo >&2 ""
        echo >&2 "Example: $script --bootstrap-host 10.0.1.100 --username admin --dynamic-host 10.0.1.200"
        echo >&2 "Example: $script --dry-run --bootstrap-host 10.0.1.100 --username admin --dynamic-host 10.0.1.200"
        echo >&2 "Example: MARKLOGIC_PASSWORD=secret $script --bootstrap-host 10.0.1.100 --username admin --dynamic-host 10.0.1.200"
        echo >&2 ""
    fi
    exit 1
}

handle_exit() {
    local exit_code=$?
    
    if [ $exit_code -ne 0 ] && [ "$ERROR_OCCURRED" = false ]; then
        # Unexpected error - capture context
        ERROR_OCCURRED=true
        ERROR_STEP="${CURRENT_STEP:-Unknown}"
        
        # Provide helpful error message based on exit code
        case $exit_code in
            1)
                if [ -n "${LAST_COMMAND:-}" ]; then
                    ERROR_MESSAGE="Script failed unexpectedly (exit code $exit_code). Check the error message above for details. Last command context: $LAST_COMMAND"
                else
                    ERROR_MESSAGE="Script failed unexpectedly (exit code $exit_code). Check the error message above for details (likely syntax error, unbound variable, or command failure)"
                fi
                ;;
            2)
                ERROR_MESSAGE="Script failed due to misuse of shell builtin or incorrect command usage (exit code $exit_code). Check the error message above for details"
                ;;
            126)
                ERROR_MESSAGE="Script failed because a command was found but not executable (exit code $exit_code). Check file permissions"
                ;;
            127)
                ERROR_MESSAGE="Script failed because a command was not found (exit code $exit_code). Check that required tools (curl, etc.) are installed"
                ;;
            130)
                ERROR_MESSAGE="Script was interrupted by Ctrl+C (exit code $exit_code)"
                ;;
            *)
                ERROR_MESSAGE="Script failed unexpectedly (exit code $exit_code). Check the error message above for details"
                if [ -n "${LAST_COMMAND:-}" ]; then
                    ERROR_MESSAGE="$ERROR_MESSAGE. Last command context: $LAST_COMMAND"
                fi
                ;;
        esac
    fi
    
    # Show clear error information before cleanup
    if [ "$ERROR_OCCURRED" = true ]; then
        echo >&2 ""
        echo >&2 "═══════════════════════════════════════════════════════════════"
        echo >&2 "                        ERROR OCCURRED"
        echo >&2 "═══════════════════════════════════════════════════════════════"
        echo >&2 "$ERROR_STEP"
        echo >&2 "Error: $ERROR_MESSAGE"
        echo >&2 "═══════════════════════════════════════════════════════════════"
        echo >&2 ""
        echo >&2 "⚠️  NOTE: For some errors, including bash error messages, details may be"
        echo >&2 "    shown immediately above the summary box."
        echo >&2 ""
        echo >&2 "Performing security cleanup before exit..."
        echo >&2 ""
    fi
    
    # Always perform cleanup
    perform_cleanup
    
    # Exit with appropriate code
    if [ "$ERROR_OCCURRED" = true ] && [ $exit_code -eq 0 ]; then
        exit 1
    else
        exit $exit_code
    fi
}

set_error() {
    ERROR_OCCURRED=true
    ERROR_STEP="${CURRENT_STEP:-Unknown}"
    ERROR_MESSAGE="$1"
    LAST_COMMAND="${2:-}"
}

perform_cleanup() {
    local cleanup_needed=false
    
    # Revoke token if one was generated
    if [ -n "${DYNAMIC_TOKEN:-}" ]; then
        echo >&2 "Revoking dynamic host token for security..."
        set +e  # Don't exit on cleanup failures
        TOKEN_REVOKE_RESPONSE=$("$CURL_EXEC" --anyauth --user "${USERNAME:-}:${PASSWORD:-}" \
            -k -s -X DELETE "${BOOTSTRAP_MANAGE_URL:-}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-host-token" \
            -H "Content-Type: application/json" \
            -d '{"dynamic-host-tokens": {"token": ["'"$DYNAMIC_TOKEN"'"]}}' 2>&1)
        
        if [ "$?" -eq 0 ]; then
            echo >&2 "Successfully revoked dynamic host token"
        else
            echo >&2 "Warning: Failed to revoke token: $TOKEN_REVOKE_RESPONSE"
        fi
        set -e
        cleanup_needed=true
    fi
    
    # Disable API token authentication if it was enabled
    if [ "${API_TOKEN_AUTH_ENABLED:-false}" = true ]; then
        echo >&2 "Disabling API token authentication for security..."
        set +e  # Don't exit on cleanup failures
        API_AUTH_CLEANUP_RESPONSE=$("$CURL_EXEC" --anyauth --user "${USERNAME:-}:${PASSWORD:-}" \
            -k -s -X PUT "${BOOTSTRAP_MANAGE_URL:-}/manage/v2/servers/Admin/properties?group-id=${GROUP_NAME}" \
            -H "Content-Type: application/json" \
            -d '{"API-token-authentication":false}' 2>&1)
        
        if [ "$?" -eq 0 ]; then
            echo >&2 "Successfully disabled API token authentication"
        else
            echo >&2 "Warning: Failed to disable API token authentication: $API_AUTH_CLEANUP_RESPONSE"
        fi
        set -e
        cleanup_needed=true
    fi
    
    # Disable dynamic hosts if they were enabled
    if [ "${DYNAMIC_HOSTS_ENABLED:-false}" = true ]; then
        echo >&2 "Disabling dynamic hosts for security..."
        set +e  # Don't exit on cleanup failures
        CLEANUP_RESPONSE=$("$CURL_EXEC" --anyauth --user "${USERNAME:-}:${PASSWORD:-}" \
            -k -s -X PUT "${BOOTSTRAP_MANAGE_URL:-}/manage/v2/groups/${GROUP_NAME}/properties" \
            -H "Content-Type: application/json" \
            -d '{"allow-dynamic-hosts":false}' 2>&1)
        
        if [ "$?" -eq 0 ]; then
            echo >&2 "Successfully disabled dynamic hosts"
        else
            echo >&2 "Warning: Failed to disable dynamic hosts: $CLEANUP_RESPONSE"
        fi
        set -e
        cleanup_needed=true
    fi
    
    if [ "$cleanup_needed" = true ]; then
        echo >&2 "Security cleanup completed"
    fi
}

# =============================================================================
# ARGUMENT PARSING
# =============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --bootstrap-host)
            BOOTSTRAP_HOST="$2"
            shift 2
            ;;
        --bootstrap-admin-port)
            BOOTSTRAP_ADMIN_PORT="$2"
            shift 2
            ;;
        --bootstrap-manage-port)
            BOOTSTRAP_MANAGE_PORT="$2"
            shift 2
            ;;
        --username)
            USERNAME="$2"
            shift 2
            ;;
        --dynamic-host)
            DYNAMIC_HOST="$2"
            shift 2
            ;;
        --dynamic-admin-port)
            DYNAMIC_ADMIN_PORT="$2"
            shift 2
            ;;
        *)
            cleanup_and_exit "Unknown parameter: $1" true
            ;;
    esac
done

# Validate required parameters
[ -z "$BOOTSTRAP_HOST" ] && cleanup_and_exit "Bootstrap host is required (--bootstrap-host)" true
[ -z "$USERNAME" ] && cleanup_and_exit "Username is required (--username)" true

# Handle password: use environment variable if set, otherwise prompt for input
if [ -n "${MARKLOGIC_PASSWORD:-}" ]; then
    PASSWORD="$MARKLOGIC_PASSWORD"
else
    echo -n "Enter MarkLogic password: " >&2
    read -s PASSWORD
    echo >&2  # Add newline after silent input
    [ -z "$PASSWORD" ] && cleanup_and_exit "Password is required" true
fi

[ -z "$DYNAMIC_HOST" ] && cleanup_and_exit "New host is required (--dynamic-host)" true

# Validate that bootstrap and dynamic hosts are different
[ "$BOOTSTRAP_HOST" = "$DYNAMIC_HOST" ] && cleanup_and_exit "Bootstrap host and dynamic host cannot be the same (${BOOTSTRAP_HOST})" true

# Set defaults using constants
BOOTSTRAP_ADMIN_PORT=${BOOTSTRAP_ADMIN_PORT:-$DEFAULT_ADMIN_PORT}
BOOTSTRAP_MANAGE_PORT=${BOOTSTRAP_MANAGE_PORT:-$DEFAULT_MANAGE_PORT}
DYNAMIC_ADMIN_PORT=${DYNAMIC_ADMIN_PORT:-$DEFAULT_ADMIN_PORT}

# Dry run helper functions
check_connectivity() {
    local host="$1"
    local port="$2"
    local description="$3"
    
    if command -v nc >/dev/null 2>&1; then
        # Disable exit on error for this specific command
        set +e
        nc -z "$host" "$port" 2>/dev/null
        local result=$?
        set -e
        
        if [ $result -eq 0 ]; then
            echo "✓ Connectivity check: $description ($host:$port) - reachable"
            return 0
        else
            echo "✗ Connectivity check: $description ($host:$port) - FAILED"
            return 1
        fi
    else
        # Fallback to curl if nc is not available
        set +e
        curl -s --connect-timeout 5 "http://$host:$port" >/dev/null 2>&1
        local result=$?
        set -e
        
        if [ $result -eq 0 ]; then
            echo "✓ Connectivity check: $description ($host:$port) - reachable"
            return 0
        else
            echo "✗ Connectivity check: $description ($host:$port) - FAILED"
            return 1
        fi
    fi
}

test_authentication() {
    local response
    set +e
    response=$("$CURL_EXEC" --anyauth --user "${USERNAME}:${PASSWORD}" \
        -k -s -w "%{http_code}" -o /dev/null \
        "${BOOTSTRAP_MANAGE_URL}/manage/v2/groups" 2>/dev/null)
    local result=$?
    set -e
    
    if [ $result -eq 0 ] && [ "$response" = "200" ]; then
        echo "✓ Authentication test: $USERNAME can access management API"
        return 0
    else
        echo "✗ Authentication test: Failed (HTTP $response)"
        return 1
    fi
}

perform_dry_run() {
    echo ""
    echo "=== DRY RUN MODE - No changes will be made ==="
    echo ""
    
    local checks_passed=0
    local total_checks=0
    
    # Connectivity checks
    total_checks=$((total_checks + 1))
    if check_connectivity "$BOOTSTRAP_HOST" "$BOOTSTRAP_ADMIN_PORT" "Bootstrap admin"; then
        checks_passed=$((checks_passed + 1))
    fi
    
    total_checks=$((total_checks + 1))
    if check_connectivity "$BOOTSTRAP_HOST" "$BOOTSTRAP_MANAGE_PORT" "Bootstrap management"; then
        checks_passed=$((checks_passed + 1))
    fi
    
    total_checks=$((total_checks + 1))
    if check_connectivity "$DYNAMIC_HOST" "$DYNAMIC_ADMIN_PORT" "Dynamic host admin"; then
        checks_passed=$((checks_passed + 1))
    fi
    
    # Authentication check
    total_checks=$((total_checks + 1))
    if test_authentication; then
        checks_passed=$((checks_passed + 1))
    fi
    
    echo ""
    echo "=== Planned Operations ==="
    echo "1. → Would enable dynamic hosts on $GROUP_NAME group (temporary)"
    echo "2. → Would generate dynamic host token from bootstrap node"
    echo "3. → Would join $DYNAMIC_HOST to cluster using token"
    echo "4. → Would disable dynamic hosts for security"
    echo "5. → Would verify host acceptance in cluster"
    echo ""
    
    local checks_failed=$((total_checks - checks_passed))
    
    if [ $checks_passed -eq $total_checks ]; then
        echo "✓ All checks passed ($checks_passed/$total_checks) - script would likely succeed"
        echo "  Run without --dry-run to execute the actual operations"
        exit 0
    else
        echo "✗ $checks_failed of $total_checks checks failed ($checks_passed passed) - fix issues before running"
        exit 1
    fi
}

# =============================================================================
# MAIN SCRIPT EXECUTION
# =============================================================================

# Construct URLs
BOOTSTRAP_ADMIN_URL="https://${BOOTSTRAP_HOST}:${BOOTSTRAP_ADMIN_PORT}"
BOOTSTRAP_MANAGE_URL="https://${BOOTSTRAP_HOST}:${BOOTSTRAP_MANAGE_PORT}"
DYNAMIC_HOST_ADMIN_URL="https://${DYNAMIC_HOST}:${DYNAMIC_ADMIN_PORT}"

echo "Starting dynamic host addition process..."
echo "Parameters:"
echo "  Bootstrap host: $BOOTSTRAP_HOST"
echo "  Bootstrap admin port: $BOOTSTRAP_ADMIN_PORT"
echo "  Bootstrap manage port: $BOOTSTRAP_MANAGE_PORT"
echo "  Username: $USERNAME"
echo "  Dynamic host: $DYNAMIC_HOST"
echo "  Dynamic host admin port: $DYNAMIC_ADMIN_PORT"
if [ "$DRY_RUN" = true ]; then
    echo "  Mode: DRY RUN (preview only)"
fi
if [ "$VERBOSE" = true ]; then
    echo "  Mode: VERBOSE (detailed output)"
fi
echo ""

# Execute dry run if requested
if [ "$DRY_RUN" = true ]; then
    perform_dry_run
fi

echo "Bootstrap server admin: ${BOOTSTRAP_ADMIN_URL}"
echo "Bootstrap server manage: ${BOOTSTRAP_MANAGE_URL}"
echo "New host: ${DYNAMIC_HOST_ADMIN_URL}"

CURRENT_STEP="Step 1: Temporarily enabling dynamic hosts for group ${GROUP_NAME}"
echo ""
echo "$CURRENT_STEP..."

LAST_COMMAND="curl PUT ${BOOTSTRAP_MANAGE_URL}/manage/v2/groups/${GROUP_NAME}/properties"
ENABLE_RESPONSE=$("$CURL_EXEC" --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X PUT "${BOOTSTRAP_MANAGE_URL}/manage/v2/groups/${GROUP_NAME}/properties" \
    -H "Content-Type: application/json" \
    -d '{"allow-dynamic-hosts":true}' 2>&1)

if [ "$?" -ne 0 ]; then
    cleanup_and_exit "Failed to enable dynamic hosts: $ENABLE_RESPONSE" false
else
    DYNAMIC_HOSTS_ENABLED=true
    echo "Successfully enabled dynamic hosts for group ${GROUP_NAME}"
fi

CURRENT_STEP="Step 2: Enabling API token authentication for Admin app server"
echo ""
echo "$CURRENT_STEP..."

LAST_COMMAND="curl PUT ${BOOTSTRAP_MANAGE_URL}/manage/v2/servers/Admin/properties"
TOKEN_AUTH_RESPONSE=$("$CURL_EXEC" --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X PUT "${BOOTSTRAP_MANAGE_URL}/manage/v2/servers/Admin/properties?group-id=${GROUP_NAME}" \
    -H "Content-Type: application/json" \
    -d '{"API-token-authentication":true}' 2>&1) || \
    cleanup_and_exit "Failed to enable API token authentication: $TOKEN_AUTH_RESPONSE" false

API_TOKEN_AUTH_ENABLED=true
echo "Successfully enabled API token authentication"

CURRENT_STEP="Step 3: Generating dynamic host token"
echo ""
echo "$CURRENT_STEP..."

TOKEN_PAYLOAD=$(cat <<EOF
{
  "dynamic-host-token": {
    "group": "${GROUP_NAME}",
    "host": "${BOOTSTRAP_HOST}",
    "port": ${BOOTSTRAP_ADMIN_PORT},
    "duration": "${TOKEN_DURATION}",
    "comment": "${TOKEN_COMMENT}"
  }
}
EOF
)

echo "Requesting token from: ${BOOTSTRAP_MANAGE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-host-token"
if [ "$VERBOSE" = true ]; then
    echo "Token request payload:"
    echo "$TOKEN_PAYLOAD"
    echo ""
fi

# Generate the token using JSON format for reliable parsing
LAST_COMMAND="curl POST ${BOOTSTRAP_MANAGE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-host-token"
TOKEN_RESPONSE=$("$CURL_EXEC" --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X POST "${BOOTSTRAP_MANAGE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-host-token?format=json" \
    -H "Content-Type: application/json" \
    -d "$TOKEN_PAYLOAD" 2>&1)

if [ "$?" -ne 0 ]; then
    cleanup_and_exit "Failed to generate dynamic host token: $TOKEN_RESPONSE" false
fi

if [ "$VERBOSE" = true ]; then
    echo "Token generation response:"
    echo "$TOKEN_RESPONSE"
    echo ""
fi

# Extract token from JSON response using proper JSON parsing
LAST_COMMAND="extract token from JSON response"
DYNAMIC_TOKEN=$(extract_json_value "$TOKEN_RESPONSE" "dynamic-host-token")

if [ -z "$DYNAMIC_TOKEN" ]; then
    cleanup_and_exit "Failed to extract token from response: $TOKEN_RESPONSE" false
fi

echo "Successfully generated dynamic host token"

CURRENT_STEP="Step 4: Adding dynamic host ${DYNAMIC_HOST} to the cluster"
echo ""
echo "$CURRENT_STEP..."

# Create XML payload for joining the host
INIT_PAYLOAD="<init xmlns=\"http://marklogic.com/manage\"><dynamic-host-token>${DYNAMIC_TOKEN}</dynamic-host-token></init>"

# Join the dynamic host directly using the /admin/v1/init endpoint
LAST_COMMAND="curl POST ${DYNAMIC_HOST_ADMIN_URL}/admin/v1/init"
JOIN_RESPONSE=$("$CURL_EXEC" --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -w "HTTPCODE:%{http_code}" \
    -X POST "${DYNAMIC_HOST_ADMIN_URL}/admin/v1/init" \
    -H "Content-Type: application/xml" \
    -d "$INIT_PAYLOAD" 2>&1)

# Extract HTTP status code and body more reliably
if echo "$JOIN_RESPONSE" | grep -q "HTTPCODE:[0-9]*$"; then
    # Extract the last occurrence of HTTPCODE pattern
    HTTP_CODE=$(echo "$JOIN_RESPONSE" | grep -o "HTTPCODE:[0-9]*$" | cut -d: -f2)
    # Remove the HTTPCODE line from the end
    JOIN_BODY=$(echo "$JOIN_RESPONSE" | sed 's/HTTPCODE:[0-9]*$//')
else
    # Fallback if no HTTPCODE found
    HTTP_CODE="0"
    JOIN_BODY="$JOIN_RESPONSE"
fi

if [ "$VERBOSE" = true ]; then
    echo "Join response (HTTP $HTTP_CODE):"
    echo "$JOIN_BODY"
    echo ""
fi

# Check for success (HTTP 200/201) or specific error conditions
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "Successfully added ${DYNAMIC_HOST} to the cluster"
elif [ "$HTTP_CODE" = "401" ]; then
    cleanup_and_exit "Failed to join dynamic host: Host ${DYNAMIC_HOST} appears to already be initialized or part of another cluster (HTTP 401)" false
else
    cleanup_and_exit "Failed to join dynamic host to cluster (HTTP $HTTP_CODE): $JOIN_BODY" false
fi

CURRENT_STEP="Step 5: Performing security cleanup"
echo ""
echo "$CURRENT_STEP..."
# Note: cleanup will be performed by EXIT trap, but we can call it explicitly for user feedback
perform_cleanup

CURRENT_STEP="Step 6: Verifying dynamic hosts in cluster"
echo ""
echo "$CURRENT_STEP..."

# First check dynamic hosts endpoint
LAST_COMMAND="curl GET ${BOOTSTRAP_MANAGE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-hosts"
DYNAMIC_HOSTS_RESPONSE=$("$CURL_EXEC" --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X GET "${BOOTSTRAP_MANAGE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-hosts" \
    -H "Accept: application/json" 2>&1) || \
    cleanup_and_exit "Failed to retrieve dynamic hosts: $DYNAMIC_HOSTS_RESPONSE" false

# Also check all hosts in cluster to verify the specific host was added
LAST_COMMAND="curl GET ${BOOTSTRAP_MANAGE_URL}/manage/v2/hosts"
HOSTS_RESPONSE=$("$CURL_EXEC" --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X GET "${BOOTSTRAP_MANAGE_URL}/manage/v2/hosts" \
    -H "Accept: application/json" 2>&1) || \
    cleanup_and_exit "Failed to retrieve cluster hosts: $HOSTS_RESPONSE" false

if [ "$VERBOSE" = true ]; then
    echo "Dynamic hosts response:"
    echo "$DYNAMIC_HOSTS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DYNAMIC_HOSTS_RESPONSE"
    echo ""
    echo "All cluster hosts response:"
    echo "$HOSTS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HOSTS_RESPONSE"
    echo ""
fi

# Check if the dynamic host appears in the hosts list using proper JSON parsing
if json_contains_value "$HOSTS_RESPONSE" "$DYNAMIC_HOST"; then
    echo "✓ Verification successful: Host $DYNAMIC_HOST is now part of the cluster"
else
    echo "✗ Verification failed: Host $DYNAMIC_HOST was not found in the cluster"
    if [ "$VERBOSE" = true ]; then
        echo "Dynamic hosts response: $DYNAMIC_HOSTS_RESPONSE"
        echo "All hosts response: $HOSTS_RESPONSE"
    fi
    cleanup_and_exit "Host verification failed - $DYNAMIC_HOST was not successfully added to the cluster" false
fi

echo ""
echo "Dynamic host addition process completed successfully!"

# Note: Final cleanup will be performed automatically by EXIT trap
echo ""
echo "Summary:"
echo "- Bootstrap host: ${BOOTSTRAP_HOST}"
echo "- New dynamic host: ${DYNAMIC_HOST} (should now be active in the cluster)"
echo "- Dynamic host allowance: Temporarily enabled, then disabled for security"
echo ""
