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
        echo >&2 "Usage: $script --bootstrap-host HOST [--bootstrap-admin-port PORT] [--bootstrap-manage-port PORT] --username USER [--password PASS] --dynamic-host HOST [--dynamic-admin-port PORT]"
        echo >&2 ""
        echo >&2 "Parameters:"
        echo >&2 "  --bootstrap-host HOST         MarkLogic bootstrap server hostname/IP (existing cluster node)"
        echo >&2 "  --bootstrap-admin-port PORT   Bootstrap server admin port (default: 8001)"
        echo >&2 "  --bootstrap-manage-port PORT  Bootstrap server manage port (default: 8002)"
        echo >&2 "  --username USER               MarkLogic username"
        echo >&2 "  --password PASS               MarkLogic password (optional, uses MARKLOGIC_PASSWORD env var or prompts)"
        echo >&2 "  --dynamic-host HOST           Hostname/IP of the machine joining as dynamic host"
        echo >&2 "  --dynamic-admin-port PORT     Admin port for the joining host (default: 8001)"
        echo >&2 ""
        echo >&2 "Example: $script --bootstrap-host 10.0.1.100 --username admin --dynamic-host 10.0.1.200"
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
while [[ $# -gt 0 ]]; do
    case $1 in
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
BOOTSTRAP_ADMIN_PORT="${BOOTSTRAP_ADMIN_PORT:-8001}"
BOOTSTRAP_MANAGE_PORT="${BOOTSTRAP_MANAGE_PORT:-8002}"
DYNAMIC_ADMIN_PORT="${DYNAMIC_ADMIN_PORT:-8001}"
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
    "host": "${DYNAMIC_HOST}",
    "port": ${DYNAMIC_ADMIN_PORT},
    "duration": "${DURATION}",
    "comment": "${COMMENT}"
  }
}
EOF
)

echo "Requesting token from: ${BOOTSTRAP_MANAGE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-host-token"

# Generate the token using XML format for easier parsing like their script
TOKEN_RESPONSE=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X POST "${BOOTSTRAP_MANAGE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-host-token?format=xml" \
    -H "Content-Type: application/json" \
    -d "$TOKEN_PAYLOAD" 2>&1)

if [ "$?" -ne 0 ]; then
    cleanup_and_exit "Failed to generate dynamic host token: $TOKEN_RESPONSE"
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
    -k -s -X POST "${DYNAMIC_HOST_ADMIN_URL}/admin/v1/init" \
    -H "Content-Type: application/xml" \
    -d "$INIT_PAYLOAD" 2>&1)

if [ "$?" -ne 0 ]; then
    cleanup_and_exit "Failed to join dynamic host to cluster: $JOIN_RESPONSE"
fi

echo "Successfully added ${DYNAMIC_HOST} to the cluster"

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

HOSTS_RESPONSE=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X GET "${BOOTSTRAP_MANAGE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-hosts" \
    -H "Accept: application/json" 2>&1) || \
    die "Failed to retrieve dynamic hosts: $HOSTS_RESPONSE" false

echo "Current dynamic hosts response:"
echo "$HOSTS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HOSTS_RESPONSE"

echo ""
echo "Dynamic host addition process completed successfully!"
echo ""
echo "Summary:"
echo "- Bootstrap host: ${BOOTSTRAP_HOST}"
echo "- New dynamic host: ${DYNAMIC_HOST} (should now be active in the cluster)"
echo "- Dynamic host allowance: Temporarily enabled, then disabled for security"
echo ""
