#!/bin/bash
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
# 1. Interactive prompt (RECOMMENDED): Omit --password to be prompted securely
#    Example: ./addDynamicHost.sh --bootstrap-host HOST --username USER --dynamic-host HOST
#
# 2. Environment variable: Set MARKLOGIC_PASSWORD before running the script
#    Example: export MARKLOGIC_PASSWORD=secret; ./addDynamicHost.sh ...
#    Or with sudo: sudo MARKLOGIC_PASSWORD=secret runuser -u daemon -- ./addDynamicHost.sh ...
#
# 3. Command line argument: Use --password (LEAST SECURE - visible in process list and history)
#    Example: ./addDynamicHost.sh --bootstrap-host HOST --username USER --password SECRET --dynamic-host HOST
#
# Prerequisites:
#
# - curl must be available in PATH
# - The MarkLogic user must have admin privileges or appropriate dynamic host management roles
# - MarkLogic Server must be installed and running (but uninitialized) on the dynamic host
# - To write to ErrorLog.txt, the script's process owner must have write permissions to it.
#   (e.g., sudo runuser -u daemon bash addDynamicHost.sh ...)
#

die () {
    # Write error message to a monitored MarkLogic log file if it exists.
    if [ -f "/var/opt/MarkLogic/Logs/ErrorLog.txt" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') Unable to add dynamic host: $1" >> /var/opt/MarkLogic/Logs/ErrorLog.txt
    fi

    script=`basename "$0"`
    echo >&2 ""
    echo >&2 "$1"
    echo >&2 ""
    if [ "$2" = true ]; then
        echo >&2 "Usage: $script [--dry-run] [--verbose] --bootstrap-host HOST [--bootstrap-admin-port PORT] [--bootstrap-manage-port PORT] --username USER [--password PASS] --dynamic-host HOST [--dynamic-admin-port PORT]"
        echo >&2 ""
        echo >&2 "Parameters:"
        echo >&2 "  --dry-run                     Preview actions without making changes"
        echo >&2 "  --verbose                     Show detailed request/response information"
        echo >&2 "  --bootstrap-host HOST         MarkLogic bootstrap server hostname/IP (existing cluster node)"
        echo >&2 "  --bootstrap-admin-port PORT   Bootstrap server admin port (default: 8001)"
        echo >&2 "  --bootstrap-manage-port PORT  Bootstrap server manage port (default: 8002)"
        echo >&2 "  --username USER               MarkLogic username"
        echo >&2 "  --password PASS               MarkLogic password (optional, uses MARKLOGIC_PASSWORD env var or prompts)"
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

cleanup_and_exit() {
    echo >&2 ""
    echo >&2 "Error: $1"
    
    # Always attempt cleanup if we enabled dynamic hosts
    if [ "$DYNAMIC_HOSTS_ENABLED" = true ]; then
        echo >&2 ""
        echo >&2 "Attempting to disable dynamic hosts for security cleanup..."
        CLEANUP_RESPONSE=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
            -k -s -X PUT "${BOOTSTRAP_MANAGE_URL}/manage/v2/groups/${GROUP_NAME}/properties" \
            -H "Content-Type: application/json" \
            -d '{"allow-dynamic-hosts":false}' 2>&1)
        
        if [ "$?" -eq 0 ]; then
            echo >&2 "Successfully disabled dynamic hosts during cleanup"
        else
            echo >&2 "Warning: Failed to disable dynamic hosts during cleanup: $CLEANUP_RESPONSE"
        fi
    fi
    
    die "$1" false
}

# Parse command line arguments
DRY_RUN=false
VERBOSE=false
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
        --password)
            PASSWORD="$2"
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
            die "Unknown parameter: $1" true
            ;;
    esac
done

# Validate required parameters
[ -z "$BOOTSTRAP_HOST" ] && die "Bootstrap host is required (--bootstrap-host)" true
[ -z "$USERNAME" ] && die "Username is required (--username)" true

# Handle password: use environment variable if set, otherwise prompt for input
if [ -z "$PASSWORD" ]; then
    if [ -n "$MARKLOGIC_PASSWORD" ]; then
        PASSWORD="$MARKLOGIC_PASSWORD"
    else
        echo -n "Enter MarkLogic password: " >&2
        read -s PASSWORD
        echo >&2  # Add newline after silent input
        [ -z "$PASSWORD" ] && die "Password is required" true
    fi
fi

[ -z "$DYNAMIC_HOST" ] && die "New host is required (--dynamic-host)" true

# Validate that bootstrap and dynamic hosts are different
[ "$BOOTSTRAP_HOST" = "$DYNAMIC_HOST" ] && die "Bootstrap host and dynamic host cannot be the same (${BOOTSTRAP_HOST})" true

# Set defaults
BOOTSTRAP_ADMIN_PORT=${BOOTSTRAP_ADMIN_PORT:-8001}
BOOTSTRAP_MANAGE_PORT=${BOOTSTRAP_MANAGE_PORT:-8002}
DYNAMIC_ADMIN_PORT=${DYNAMIC_ADMIN_PORT:-8001}

# Dry run helper functions
check_connectivity() {
    local host="$1"
    local port="$2"
    local description="$3"
    
    if command -v nc >/dev/null 2>&1; then
        if nc -z "$host" "$port" 2>/dev/null; then
            echo "✓ Connectivity check: $description ($host:$port) - reachable"
            return 0
        else
            echo "✗ Connectivity check: $description ($host:$port) - FAILED"
            return 1
        fi
    else
        # Fallback to curl if nc is not available
        if curl -s --connect-timeout 5 "http://$host:$port" >/dev/null 2>&1; then
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
    response=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
        -k -s -w "%{http_code}" -o /dev/null \
        "${BOOTSTRAP_MANAGE_URL}/manage/v2/groups" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
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
    echo "1. → Would enable dynamic hosts on Default group (temporary)"
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
CLUSTER_NAME="Default"
GROUP_NAME="Default"
DURATION="PT15M"
COMMENT="auto-scaling event"

curlExec=/usr/bin/curl

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

# Step 1: Enable dynamic hosts for the group temporarily
echo ""
echo "Step 1: Temporarily enabling dynamic hosts for group ${GROUP_NAME}..."

DYNAMIC_HOSTS_ENABLED=false
ENABLE_RESPONSE=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X PUT "${BOOTSTRAP_MANAGE_URL}/manage/v2/groups/${GROUP_NAME}/properties" \
    -H "Content-Type: application/json" \
    -d '{"allow-dynamic-hosts":true}' 2>&1)

if [ "$?" -ne 0 ]; then
    die "Failed to enable dynamic hosts: $ENABLE_RESPONSE" false
else
    DYNAMIC_HOSTS_ENABLED=true
    echo "Successfully enabled dynamic hosts for group ${GROUP_NAME}"
fi

# Step 2: Enable API token authentication for Admin app server
echo ""
echo "Step 2: Enabling API token authentication for Admin app server..."

TOKEN_AUTH_RESPONSE=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X PUT "${BOOTSTRAP_MANAGE_URL}/manage/v2/servers/Admin/properties?group-id=${GROUP_NAME}" \
    -H "Content-Type: application/json" \
    -d '{"API-token-authentication":true}' 2>&1) || \
    die "Failed to enable API token authentication: $TOKEN_AUTH_RESPONSE" false

echo "Successfully enabled API token authentication"

# Step 3: Generate dynamic host token
echo ""
echo "Step 3: Generating dynamic host token..."

TOKEN_PAYLOAD=$(cat <<EOF
{
  "dynamic-host-token": {
    "group": "${GROUP_NAME}",
    "host": "${BOOTSTRAP_HOST}",
    "port": ${BOOTSTRAP_ADMIN_PORT},
    "duration": "${DURATION}",
    "comment": "${COMMENT}"
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

# Generate the token using XML format for easier parsing like their script
TOKEN_RESPONSE=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X POST "${BOOTSTRAP_MANAGE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-host-token?format=xml" \
    -H "Content-Type: application/json" \
    -d "$TOKEN_PAYLOAD" 2>&1)

if [ "$?" -ne 0 ]; then
    cleanup_and_exit "Failed to generate dynamic host token: $TOKEN_RESPONSE"
fi

if [ "$VERBOSE" = true ]; then
    echo "Token generation response:"
    echo "$TOKEN_RESPONSE"
    echo ""
fi

# Extract token from XML response using sed like their script
DYNAMIC_TOKEN=$(echo "$TOKEN_RESPONSE" | grep "dynamic-host-token" | sed 's%^.*<dynamic-host-token.*>\(.*\)</dynamic-host-token>.*$%\1%')

if [ -z "$DYNAMIC_TOKEN" ]; then
    cleanup_and_exit "Failed to extract token from response: $TOKEN_RESPONSE"
fi

echo "Successfully generated dynamic host token"

# Step 4: Directly join the dynamic host to the cluster
echo ""
echo "Step 4: Adding dynamic host ${DYNAMIC_HOST} to the cluster..."

# Create XML payload for joining the host
INIT_PAYLOAD="<init xmlns=\"http://marklogic.com/manage\"><dynamic-host-token>${DYNAMIC_TOKEN}</dynamic-host-token></init>"

# Join the dynamic host directly using the /admin/v1/init endpoint
JOIN_RESPONSE=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -w "HTTPCODE:%{http_code}" \
    -X POST "${DYNAMIC_HOST_ADMIN_URL}/admin/v1/init" \
    -H "Content-Type: application/xml" \
    -d "$INIT_PAYLOAD" 2>&1)

# Extract HTTP status code
HTTP_CODE=$(echo "$JOIN_RESPONSE" | grep -o "HTTPCODE:[0-9]*" | cut -d: -f2)
JOIN_BODY=$(echo "$JOIN_RESPONSE" | sed 's/HTTPCODE:[0-9]*$//')

if [ "$VERBOSE" = true ]; then
    echo "Join response (HTTP $HTTP_CODE):"
    echo "$JOIN_BODY"
    echo ""
fi

# Check for success (HTTP 200/201) or specific error conditions
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "Successfully added ${DYNAMIC_HOST} to the cluster"
elif [ "$HTTP_CODE" = "401" ]; then
    cleanup_and_exit "Failed to join dynamic host: Host ${DYNAMIC_HOST} appears to already be initialized or part of another cluster (HTTP 401)"
else
    cleanup_and_exit "Failed to join dynamic host to cluster (HTTP $HTTP_CODE): $JOIN_BODY"
fi

# Step 5: Disable dynamic hosts for security (cleanup)
if [ "$DYNAMIC_HOSTS_ENABLED" = true ]; then
    echo ""
    echo "Step 5: Disabling dynamic hosts for security..."

    DISABLE_RESPONSE=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
        -k -s -X PUT "${BOOTSTRAP_MANAGE_URL}/manage/v2/groups/${GROUP_NAME}/properties" \
        -H "Content-Type: application/json" \
        -d '{"allow-dynamic-hosts":false}' 2>&1)

    if [ "$?" -eq 0 ]; then
        echo "Successfully disabled dynamic hosts for group ${GROUP_NAME}"
    else
        echo >&2 "Warning: Failed to disable dynamic hosts: $DISABLE_RESPONSE"
    fi
fi

# Step 6: Verify dynamic hosts in cluster
echo ""
echo "Step 6: Verifying dynamic hosts in cluster..."

# First check dynamic hosts endpoint
DYNAMIC_HOSTS_RESPONSE=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X GET "${BOOTSTRAP_MANAGE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-hosts" \
    -H "Accept: application/json" 2>&1) || \
    die "Failed to retrieve dynamic hosts: $DYNAMIC_HOSTS_RESPONSE" false

# Also check all hosts in cluster to verify the specific host was added
HOSTS_RESPONSE=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X GET "${BOOTSTRAP_MANAGE_URL}/manage/v2/hosts" \
    -H "Accept: application/json" 2>&1) || \
    die "Failed to retrieve cluster hosts: $HOSTS_RESPONSE" false

if [ "$VERBOSE" = true ]; then
    echo "Dynamic hosts response:"
    echo "$DYNAMIC_HOSTS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DYNAMIC_HOSTS_RESPONSE"
    echo ""
    echo "All cluster hosts response:"
    echo "$HOSTS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HOSTS_RESPONSE"
    echo ""
fi

# Check if the dynamic host appears in the hosts list
if echo "$HOSTS_RESPONSE" | grep -q "$DYNAMIC_HOST"; then
    echo "✓ Verification successful: Host $DYNAMIC_HOST is now part of the cluster"
else
    echo "✗ Verification failed: Host $DYNAMIC_HOST was not found in the cluster"
    echo "Dynamic hosts response: $DYNAMIC_HOSTS_RESPONSE"
    die "Host verification failed - $DYNAMIC_HOST was not successfully added to the cluster" false
fi

echo ""
echo "Dynamic host addition process completed successfully!"
echo ""
echo "Summary:"
echo "- Bootstrap host: ${BOOTSTRAP_HOST}"
echo "- New dynamic host: ${DYNAMIC_HOST} (should now be active in the cluster)"
echo "- Dynamic host allowance: Temporarily enabled, then disabled for security"
echo ""
