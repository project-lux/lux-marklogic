#!/bin/bash
set -euo pipefail

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
# INPUT VALIDATION FUNCTIONS
# =============================================================================

# Validate hostname or IP address format
# Usage: validate_hostname_or_ip "hostname"
validate_hostname_or_ip() {
    local host="$1"
    
    # Check for empty input
    [ -z "$host" ] && return 1
    
    # Check for IPv4 format (basic pattern)
    if echo "$host" | grep -qE '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'; then
        # Validate IPv4 octets are 0-255
        local IFS='.'
        local octets=($host)
        for octet in "${octets[@]}"; do
            [ "$octet" -gt 255 ] 2>/dev/null && return 1
        done
        return 0
    fi
    
    # Check for IPv6 format (simplified - contains colons and hex)
    if echo "$host" | grep -qE '^[0-9a-fA-F:]+$' && echo "$host" | grep -q ':'; then
        return 0
    fi
    
    # Check if it looks like a malformed IP (contains only digits and dots but didn't match IPv4 pattern)
    if echo "$host" | grep -qE '^[0-9.]+$'; then
        # This catches things like "10.5.156.154.14" or "999.999.999.999"
        return 1
    fi
    
    # Check for valid hostname format (RFC compliant)
    # - Start and end with alphanumeric
    # - Can contain alphanumeric, hyphens, and dots
    # - Each label max 63 chars, total max 253 chars
    if echo "$host" | grep -qE '^[a-zA-Z0-9]([a-zA-Z0-9\.-]*[a-zA-Z0-9])?$'; then
        # Check length constraints
        [ ${#host} -le 253 ] || return 1
        
        # Check each label is max 63 characters
        local IFS='.'
        local labels=($host)
        for label in "${labels[@]}"; do
            [ ${#label} -le 63 ] || return 1
            # Labels can't start or end with hyphen
            echo "$label" | grep -qE '^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?$' || return 1
        done
        return 0
    fi
    
    return 1
}

# Validate port number
# Usage: validate_port "8001"
validate_port() {
    local port="$1"
    
    # Check if numeric and in valid range
    if echo "$port" | grep -qE '^[0-9]+$'; then
        [ "$port" -ge 1 ] && [ "$port" -le 65535 ] 2>/dev/null
        return $?
    fi
    
    return 1
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

cleanup_and_exit () {
    # Set error context if we haven't already set an error
    if [ "$ERROR_OCCURRED" = false ]; then
        # Determine the appropriate error step
        local error_step="${CURRENT_STEP:-Validation}"
        ERROR_OCCURRED=true
        ERROR_STEP="$error_step"
        ERROR_MESSAGE="$1"
        LAST_COMMAND="${2:-}"
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
        echo >&2 "Usage: $script [--dry-run] [--verbose] --bootstrap-host HOST --username USER --dynamic-host HOST [options]"
        echo >&2 ""
        echo >&2 "Required:"
        echo >&2 "  --bootstrap-host HOST         Existing cluster node hostname/IP"
        echo >&2 "  --username USER               MarkLogic admin username"
        echo >&2 "  --dynamic-host HOST           New host to add to cluster"
        echo >&2 ""
        echo >&2 "Optional:"
        echo >&2 "  --dry-run                     Show configuration and exit"
        echo >&2 "  --verbose                     Show detailed output"
        echo >&2 "  --bootstrap-admin-port PORT   Bootstrap admin port (default: $DEFAULT_ADMIN_PORT)"
        echo >&2 "  --bootstrap-manage-port PORT  Bootstrap manage port (default: $DEFAULT_MANAGE_PORT)"
        echo >&2 "  --dynamic-admin-port PORT     Dynamic host admin port (default: $DEFAULT_ADMIN_PORT)"
        echo >&2 ""
        echo >&2 "Password: Use MARKLOGIC_PASSWORD env var or interactive prompt"
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
        echo >&2 "⚠️  NOTE: When the error message is vague, check above 'Usage:'"
        echo >&2 "    as you may find additional details there."
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
if ! validate_hostname_or_ip "$BOOTSTRAP_HOST"; then
    cleanup_and_exit "Invalid bootstrap host format: $BOOTSTRAP_HOST (must be valid hostname or IP address)" true
fi

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
if ! validate_hostname_or_ip "$DYNAMIC_HOST"; then
    cleanup_and_exit "Invalid dynamic host format: $DYNAMIC_HOST (must be valid hostname or IP address)" true
fi

# Validate that bootstrap and dynamic hosts are different
[ "$BOOTSTRAP_HOST" = "$DYNAMIC_HOST" ] && cleanup_and_exit "Bootstrap host and dynamic host cannot be the same (${BOOTSTRAP_HOST})" true

# Set port defaults and validate
BOOTSTRAP_ADMIN_PORT=${BOOTSTRAP_ADMIN_PORT:-$DEFAULT_ADMIN_PORT}
BOOTSTRAP_MANAGE_PORT=${BOOTSTRAP_MANAGE_PORT:-$DEFAULT_MANAGE_PORT} 
DYNAMIC_ADMIN_PORT=${DYNAMIC_ADMIN_PORT:-$DEFAULT_ADMIN_PORT}

for port_check in "bootstrap admin:$BOOTSTRAP_ADMIN_PORT" "bootstrap manage:$BOOTSTRAP_MANAGE_PORT" "dynamic host admin:$DYNAMIC_ADMIN_PORT"; do
    port_name="${port_check%:*}"
    port_value="${port_check#*:}"
    validate_port "$port_value" || cleanup_and_exit "Invalid $port_name port: $port_value (must be 1-65535)" true
done

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

# Execute dry run if requested - show configuration and validate connectivity
if [ "$DRY_RUN" = true ]; then
    echo ""
    echo "=== DRY RUN MODE - No changes will be made ==="
    echo "Configuration:"
    echo "  Bootstrap: $BOOTSTRAP_HOST:$BOOTSTRAP_ADMIN_PORT (admin) / $BOOTSTRAP_HOST:$BOOTSTRAP_MANAGE_PORT (manage)"
    echo "  Dynamic host: $DYNAMIC_HOST:$DYNAMIC_ADMIN_PORT"
    echo "  Username: $USERNAME"
    echo ""
    
    # Simple connectivity checks using curl (no complex fallback logic)
    echo "Connectivity checks:"
    if curl -s --connect-timeout 5 "$BOOTSTRAP_HOST:$BOOTSTRAP_ADMIN_PORT" >/dev/null 2>&1; then
        echo "✓ Bootstrap admin port reachable"
    else
        echo "✗ Bootstrap admin port ($BOOTSTRAP_HOST:$BOOTSTRAP_ADMIN_PORT) unreachable"
    fi
    
    if curl -s --connect-timeout 5 "$BOOTSTRAP_HOST:$BOOTSTRAP_MANAGE_PORT" >/dev/null 2>&1; then
        echo "✓ Bootstrap manage port reachable"
    else
        echo "✗ Bootstrap manage port ($BOOTSTRAP_HOST:$BOOTSTRAP_MANAGE_PORT) unreachable"
    fi
    
    if curl -s --connect-timeout 5 "$DYNAMIC_HOST:$DYNAMIC_ADMIN_PORT" >/dev/null 2>&1; then
        echo "✓ Dynamic host admin port reachable"
    else
        echo "✗ Dynamic host admin port ($DYNAMIC_HOST:$DYNAMIC_ADMIN_PORT) unreachable"
    fi
    
    echo ""
    echo "Operations that would be performed:"
    echo "1. Enable dynamic hosts on $GROUP_NAME group (temporary)"
    echo "2. Generate dynamic host token from bootstrap node"
    echo "3. Join $DYNAMIC_HOST to cluster using token"
    echo "4. Disable dynamic hosts for security"
    echo "5. Verify host acceptance in cluster"
    echo ""
    echo "Run without --dry-run to execute the actual operations"
    exit 0
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
echo "Attempting to join dynamic host to cluster..."

# Use more detailed curl output and better error capture
set +e  # Temporarily disable exit on error to capture details
JOIN_RESPONSE=$("$CURL_EXEC" --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -w "HTTPCODE:%{http_code}" --connect-timeout 30 --max-time 60 \
    -X POST "${DYNAMIC_HOST_ADMIN_URL}/admin/v1/init" \
    -H "Content-Type: application/xml" \
    -d "$INIT_PAYLOAD" 2>&1)
JOIN_EXIT_CODE=$?
set -e  # Re-enable exit on error

# Check if curl command itself failed
if [ $JOIN_EXIT_CODE -ne 0 ]; then
    cleanup_and_exit "Failed to join dynamic host: curl error code $JOIN_EXIT_CODE when connecting to $DYNAMIC_HOST:$DYNAMIC_ADMIN_PORT. See https://curl.se/libcurl/c/libcurl-errors.html for error details. Response: $JOIN_RESPONSE" false
fi

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
