#!/bin/bash
#
# This script adds a dynamic host to a MarkLogic cluster by:
# 1. Generating a dynamic host token from the static node.
# 2. Adding the token to the dynamic node's configuration file.
# 3. Verifying the dynamic host was accepted by the cluster.
#
# It can be run interactively or headless. If an error occurs, the script appends an error
# message to /var/opt/MarkLogic/Logs/ErrorLog.txt. This log should be monitored so a system
# administrator is notified. The unique string included is "Unable to add dynamic host".
#
# Prerequisites:
#
# - curl must be available in PATH
# - The MarkLogic user must have admin privileges or appropriate dynamic host management roles
# - The target group must be enabled to allow dynamic hosts
# - The Admin app server must be enabled to authenticate tokens
# - Write access to /etc/sysconfig/MarkLogic (for AL 2023 systemctl compatibility)
#

die () {
    # Write error message to a monitored MarkLogic log file.
    echo "$(date '+%Y-%m-%d %H:%M:%S') Unable to add dynamic host: $1" >> /var/opt/MarkLogic/Logs/ErrorLog.txt

    script=`basename "$0"`
    echo >&2 ""
    echo >&2 "$1"
    echo >&2 ""
    if [ "$2" = true ]; then
        echo >&2 "Usage: $script --existing-host HOST --existing-port PORT --username USER --password PASS --new-host HOST --new-port PORT [--config-path PATH]"
        echo >&2 ""
        echo >&2 "Parameters:"
        echo >&2 "  --existing-host HOST  MarkLogic existing server hostname/IP"
        echo >&2 "  --existing-port PORT  MarkLogic existing server port (typically 8001)"
        echo >&2 "  --username USER       MarkLogic username"
        echo >&2 "  --password PASS       MarkLogic password"
        echo >&2 "  --new-host HOST       Hostname/IP of the machine joining as dynamic host"
        echo >&2 "  --new-port PORT       Port for the joining host (typically 8001)"
        echo >&2 "  --config-path PATH    Path to MarkLogic config file (default: /etc/sysconfig/MarkLogic)"
        echo >&2 ""
        echo >&2 "Example: $script --existing-host 10.0.1.100 --existing-port 8001 --username admin --password secret --new-host 10.0.1.200 --new-port 8001"
        echo >&2 ""
    fi
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --existing-host)
            EXISTING_HOST="$2"
            shift 2
            ;;
        --existing-port)
            EXISTING_PORT="$2"
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
        --new-host)
            NEW_HOST="$2"
            shift 2
            ;;
        --new-port)
            NEW_PORT="$2"
            shift 2
            ;;
        --config-path)
            CONFIG_PATH="$2"
            shift 2
            ;;
        *)
            die "Unknown parameter: $1" true
            ;;
    esac
done

# Validate required parameters
[ -z "$EXISTING_HOST" ] && die "Existing host is required (--existing-host)" true
[ -z "$EXISTING_PORT" ] && die "Existing port is required (--existing-port)" true
[ -z "$USERNAME" ] && die "Username is required (--username)" true
[ -z "$PASSWORD" ] && die "Password is required (--password)" true
[ -z "$NEW_HOST" ] && die "New host is required (--new-host)" true
[ -z "$NEW_PORT" ] && die "New port is required (--new-port)" true

# Set defaults
CONFIG_PATH="${CONFIG_PATH:-/etc/sysconfig/MarkLogic}"
CLUSTER_NAME="Default"
GROUP_NAME="Default"
DURATION="PT15M"
COMMENT="auto-scaling event"

# Construct base URLs
EXISTING_BASE_URL="https://${EXISTING_HOST}:${EXISTING_PORT}"
MANAGE_BASE_URL="https://${EXISTING_HOST}:8002"

echo "Starting dynamic host addition process..."
echo "Existing server: ${EXISTING_BASE_URL}"
echo "New host: ${NEW_HOST}:${NEW_PORT}"
echo "Config file: ${CONFIG_PATH}"

# Step 1: Generate dynamic host token
echo ""
echo "Step 1: Generating dynamic host token..."

TOKEN_PAYLOAD=$(cat <<EOF
{
  "dynamic-host-token": {
    "group": "${GROUP_NAME}",
    "host": "${NEW_HOST}",
    "port": ${NEW_PORT},
    "duration": "${DURATION}",
    "comment": "${COMMENT}"
  }
}
EOF
)

echo "Requesting token from: ${MANAGE_BASE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-host-token"

# Generate the token
TOKEN_RESPONSE=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X POST "${MANAGE_BASE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-host-token" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -d "$TOKEN_PAYLOAD" 2>&1) || \
    die "Failed to generate dynamic host token: $TOKEN_RESPONSE" false

# Extract token from response (assuming JSON format with token field)
DYNAMIC_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$DYNAMIC_TOKEN" ]; then
    die "Failed to extract token from response: $TOKEN_RESPONSE" false
fi

echo "Successfully generated dynamic host token"

# Step 2: Add token to MarkLogic configuration file
echo ""
echo "Step 2: Adding token to MarkLogic configuration..."

# Check if config file exists
if [ ! -f "$CONFIG_PATH" ]; then
    die "MarkLogic configuration file not found: $CONFIG_PATH" false
fi

# Check if we can write to the config file
if [ ! -w "$CONFIG_PATH" ]; then
    die "Cannot write to MarkLogic configuration file: $CONFIG_PATH (check permissions)" false
fi

# Check if MARKLOGIC_DYNAMIC_HOST_TOKEN already exists in the file
if grep -q "MARKLOGIC_DYNAMIC_HOST_TOKEN" "$CONFIG_PATH"; then
    die "MARKLOGIC_DYNAMIC_HOST_TOKEN already exists in $CONFIG_PATH. Please remove it first." false
fi

# Add the token to the configuration file
echo "export MARKLOGIC_DYNAMIC_HOST_TOKEN=\"$DYNAMIC_TOKEN\"" >> "$CONFIG_PATH" || \
    die "Failed to add token to configuration file: $CONFIG_PATH" false

echo "Successfully added token to configuration file"
echo "Note: You must restart MarkLogic Server on the joining host for the token to take effect"

# Step 3: Verify dynamic hosts (this will show the current state, join host won't appear until MarkLogic restart)
echo ""
echo "Step 3: Checking current dynamic hosts in cluster..."

HOSTS_RESPONSE=$($curlExec --anyauth --user "${USERNAME}:${PASSWORD}" \
    -k -s -X GET "${MANAGE_BASE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-hosts" \
    -H "Accept: application/json" 2>&1) || \
    die "Failed to retrieve dynamic hosts: $HOSTS_RESPONSE" false

echo "Current dynamic hosts response:"
echo "$HOSTS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HOSTS_RESPONSE"

echo ""
echo "Dynamic host addition process completed successfully!"
echo ""
echo "Next steps:"
echo "1. Restart MarkLogic Server on the new host (${NEW_HOST})"
echo "2. Verify the host appears in the dynamic hosts list by running this verification command:"
echo "   curl --anyauth --user ${USERNAME}:**** -k -X GET ${MANAGE_BASE_URL}/manage/v2/clusters/${CLUSTER_NAME}/dynamic-hosts -H \"Accept: application/json\""
echo ""
