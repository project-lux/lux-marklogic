#!/bin/bash

# -----------------------------------------------------------------------------
# getEc2InstanceMetadata.sh
#
# Purpose:
#   Retrieves EC2 instance metadata using IMDSv2 (Instance Metadata Service v2).
#
# Usage:
#   ./getEc2InstanceMetadata.sh
#
# Requirements:
#   - Must be run on an AWS EC2 instance.
#   - Requires 'curl' to be installed.
#   - Instance must support IMDSv2.
#
# Notes:
#   - The script fetches a session token and uses it to query various metadata items.
#   - Some metadata items may not be available depending on the instance configuration.
# -----------------------------------------------------------------------------
# Get token for IMDSv2
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

if [ -z "$TOKEN" ]; then
    echo "Failed to get token"
    exit 1
fi

echo "Token obtained: $TOKEN"
echo "================================"

# Base URL for metadata
base_url="http://169.254.169.254/latest/meta-data"

# Function to get metadata
get_metadata() {
    local path="$1"
    local name="$2"
    echo -n "$name: "
    result=$(curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" "$base_url/$path" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "$result"
    else
        echo "Not available or error"
    fi
}

# Get each metadata item
get_metadata "ami-id" "AMI ID"
get_metadata "ami-launch-index" "AMI Launch Index"
get_metadata "ami-manifest-path" "AMI Manifest Path"
get_metadata "hostname" "Hostname"
get_metadata "instance-action" "Instance Action"
get_metadata "instance-id" "Instance ID"
get_metadata "instance-life-cycle" "Instance Life Cycle"
get_metadata "instance-type" "Instance Type"
get_metadata "local-hostname" "Local Hostname"
get_metadata "local-ipv4" "Local IPv4"
get_metadata "mac" "MAC Address"
get_metadata "profile" "Profile"
get_metadata "reservation-id" "Reservation ID"
get_metadata "security-groups" "Security Groups"

echo "================================"
echo "Directory-type metadata (showing first level):"

# For directories, show their contents
echo -n "Autoscaling: "
curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" "$base_url/autoscaling/" 2>/dev/null || echo "Not available"

echo -n "Block Device Mapping: "
curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" "$base_url/block-device-mapping/" 2>/dev/null || echo "Not available"

echo -n "Events: "
curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" "$base_url/events/" 2>/dev/null || echo "Not available"

echo -n "IAM: "
curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" "$base_url/iam/" 2>/dev/null || echo "Not available"

echo -n "Identity Credentials: "
curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" "$base_url/identity-credentials/" 2>/dev/null || echo "Not available"

echo -n "Metrics: "
curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" "$base_url/metrics/" 2>/dev/null || echo "Not available"

echo -n "Network: "
curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" "$base_url/network/" 2>/dev/null || echo "Not available"

echo -n "Placement: "
curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" "$base_url/placement/" 2>/dev/null || echo "Not available"

echo -n "Public Keys: "
curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" "$base_url/public-keys/" 2>/dev/null || echo "Not available"

echo -n "Services: "
curl -s -f -H "X-aws-ec2-metadata-token: $TOKEN" "$base_url/services/" 2>/dev/null || echo "Not available"

echo "================================"
echo "Done!"
