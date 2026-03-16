#!/usr/bin/env bash

#
# Load Balancer Management Script
#
# This script adds or removes an EC2 instance from multiple ALB target groups.
# 
# Usage:
#   ./updateLoadBalancer.sh <add|remove> [instance-id] [target-groups]
#
# Parameters:
#   $1: Action - "add" or "remove"
#   $2: Instance ID (optional) - defaults to LB_INSTANCE_ID environment variable
#   $3: Target groups (optional) - comma-separated ARNs, defaults to LB_TARGET_GROUPS environment variable
#
# Environment Variables:
#   LB_INSTANCE_ID: EC2 instance ID (e.g., i-1234567890abcdef0)
#   LB_TARGET_GROUPS: Comma-separated target group ARNs (spaces around commas are supported)
#
# Example:
#   ./updateLoadBalancer.sh add i-1234567890abcdef0 "arn:aws:elasticloadbalancing:us-east-1:123:targetgroup/app1/abc, arn:aws:elasticloadbalancing:us-east-1:123:targetgroup/app2/def"
#

# Configuration
ACTION="$1"
INSTANCE_ID="${2:-${LB_INSTANCE_ID:-}}"

# Handle target groups from parameter or environment variable
if [ -n "$3" ]; then
    IFS=',' read -ra TARGET_GROUPS <<< "$3"
else
    IFS=',' read -ra TARGET_GROUPS <<< "${LB_TARGET_GROUPS:-}"
fi

# Function to show usage
show_usage() {
    if [ $# -gt 0 ]; then
        echo ""
        echo -e "\033[31mERROR:\033[0m $*"
        echo ""
    fi
    echo "Usage: $0 <add|remove> [instance-id] [target-groups]"
    echo ""
    echo "Parameters:"
    echo "  action: 'add' or 'remove'"
    echo "  instance-id: EC2 instance ID (optional, defaults to LB_INSTANCE_ID env var)"
    echo "  target-groups: Comma-separated target group ARNs (optional, defaults to LB_TARGET_GROUPS env var)"
    echo ""
    echo "Environment variables (used as defaults):"
    echo "  LB_INSTANCE_ID: EC2 instance ID"
    echo "  LB_TARGET_GROUPS: Comma-separated target group ARNs"
    echo ""
}

# Validation
if [ -z "$ACTION" ] || [[ ! "$ACTION" =~ ^(add|remove)$ ]]; then
    show_usage "Invalid or missing action. Must be 'add' or 'remove'."
    exit 1
fi

if [ -z "$INSTANCE_ID" ]; then
    show_usage "Instance ID not provided and LB_INSTANCE_ID environment variable not set."
    exit 1
fi

if [ ${#TARGET_GROUPS[@]} -eq 0 ]; then
    show_usage "Target groups not provided and LB_TARGET_GROUPS environment variable not set."
    exit 1
fi

# Set action-specific variables
if [ "$ACTION" = "add" ]; then
    VERB="Registering"
    COMMAND="register-targets"
else
    VERB="Deregistering"
    COMMAND="deregister-targets"
fi

# Execute for each target group
for TARGET_GROUP in "${TARGET_GROUPS[@]}"; do
    # Trim whitespace from target group ARN
    TARGET_GROUP=$(echo "$TARGET_GROUP" | xargs)
    echo "$VERB instance $INSTANCE_ID from Target Group: $TARGET_GROUP"
    aws elbv2 $COMMAND --target-group-arn "$TARGET_GROUP" --targets Id=$INSTANCE_ID
done