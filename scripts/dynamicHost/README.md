# MarkLogic Dynamic Host for LUX

- [MarkLogic Dynamic Host for LUX](#marklogic-dynamic-host-for-lux)
  - [High-Level Steps and Implementation Status](#high-level-steps-and-implementation-status)
    - [Scale Out](#scale-out)
      - [Monitor \& Initiate](#monitor--initiate)
      - [EC2 Instance](#ec2-instance)
      - [Join Cluster](#join-cluster)
      - [Register with Load Balancer](#register-with-load-balancer)
      - [Prevent Double Scale Out](#prevent-double-scale-out)
    - [Scale In](#scale-in)
  - [Intermediary Means](#intermediary-means)
    - [Start Pre-Existing EC2 instance](#start-pre-existing-ec2-instance)
    - [Add/Remove from Load Balancer](#addremove-from-load-balancer)
    - [Stop EC2 Instance](#stop-ec2-instance)
  - [Check/Change Instance Type](#checkchange-instance-type)

## High-Level Steps and Implementation Status

### Scale Out

#### Monitor & Initiate

**Implementation status:** not started

Use AWS CloudWatch metrics and alarms to monitor CPU and memory utilization and initiate a scale out.  Set a threshold for the system resources.  Use "evaluation periods" and "datapoints to alarm" to require at least one of the system resources to exceed its threshold for minutes before initiating the scale out.

#### EC2 Instance

**Implementation status:** not started

We need to decide if we want to create or simply start the dynamic host.  Regardless, we will want terraform and/or an AMI that gets the instance ready to be clustered with the bootstrap host.  [MarkLogic's dynamic evaluator host feature](https://docs.progress.com/bundle/marklogic-server-administrate-12/page/topics/dynamic-hosts.html) requires MarkLogic be installed but not initialized.  It cannot start with a data directory.  [resetLocalDynamicHost.sh](./resetLocalDynamicHost.sh) was created while testing scale out and shows what needed to be done between two scale out events.

The scale out ec2 instance need only be the `xlarge` cut of the bootstrap host type, which is 1/8th the level of system resources as the bootstrap host.

Intel, wanted but tested due to it not being available AWS AZ us-east-1a where .111 and its EBS storage were located:

* `m8i-flex.8xlarge` as bootstrap host:  $1,174, 3.9 GHz, 32 vCPUs (16 cores), and 128 GB RAM
* `m8i-flex.xlarge` as dynamic host: $147, 3.9 GHz, 4 vCPUs (2 cores), and 16 GB RAM

Intel, tested with scale out:

* `m6i.8xlarge` as bootstrap host: $1,121, 3.5 GHz, 32 vCPUs (16 cores), and 128 GB RAM
* `m6i.xlarge` as dynamic host: $140, 3.5 GHz, 4 vCPUs (2 cores), and 16 GB RAM

Graviton, tested without scale out:

* `m8g.8xlarge` as bootstrap host: $1,048, 2.8 GHz, 32 vCPUs (32 cores), and 128 GB RAM
* `m8g.xlarge` as dynamic host: $131, 2.8 GHz, 4 vCPUs (4 cores), and 16 GB RAM

#### Join Cluster

**Implementation status:** script requires review and invocable during scale out event.

[addDynamicHost.sh](./addDynamicHost.sh) was created while testing the scale out.  It implements the required portions and best security practices of the dynamic host feature.  Excerpt from the script:

```bash
# This script adds a dynamic host to a MarkLogic cluster by:
# 1. Installing MarkLogic on the dynamic host via SSH and SCP
# 2. Temporarily enabling dynamic hosts and API token authentication on the bootstrap host
# 3. Generating a dynamic host token from the bootstrap host
# 4. Directly joining the dynamic host to the cluster using the token
# 5. Revoking the token, disabling dynamic hosts and API token authentication for security
# 6. Verifying the dynamic host was accepted by the cluster
```

This is the script we will want to run once the dynamic host is running.  We will want to utilize the script's exit code to know if the script was successful.  If the script is executed from the bootstrap host and the script is unable to add the dynamic host, it will write "Unable to add dynamic host" to /var/opt/MarkLogic/Logs/ErrorLog.txt, which we should monitor for and alert the team via email.  This can be configured in the [log monitoring configuration spreadsheet](https://docs.google.com/spreadsheets/d/1uu6aL7yn047yyiZ4auujpTXnlwm01sgWZQ50ht-X4M4/edit?gid=1743835316#gid=1743835316) and pushed out via existing terraform.

The script requires MarkLogic user credentials for the bootstrap host.  In headless mode, these may be provided via environment variables.  To avoid credentials from being retained in the bash history, the script purposely does not accept the password from the command line.

The script was vibe-coded and is nearly 800 lines long.  Part of the reason for length is an attempt to have thorough checking for every step.  We should review and revise to completely understand and be able to maintain.  We may be able to reduce and/or remove some prerequisites.  We may also find additional scenarios need to be accounted for.

Full list of known prerequisites:

```bash
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
```

#### Register with Load Balancer

**Implementation status:** option to use [updateLoadBalancer.sh](./updateLoadBalancer.sh), which would need to be invocable during scale out event.

After the dynamic host is in the cluster, we need to register it with the load balancer such that the dynamic host starts to receive requests.  The cluster tested well by sending half of the requests to each host.

[updateLoadBalancer.sh](./updateLoadBalancer.sh) enables one to register or deregister an EC2 instance from a load balancer.

Copied from the script:

```bash
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
```

#### Prevent Double Scale Out

**Implementation status:** TODO

### Scale In

**Implementation status:** TODO

## Intermediary Means

### Start Pre-Existing EC2 instance

Start:

`aws ec2 start-instances --instance-ids i-1234567890abcdef0`

Check:

`aws ec2 describe-instances --instance-ids i-1234567890abcdef0 --query "Reservations[0].Instances[0].State.Name" --output text`

Wait until running:

`aws ec2 wait instance-running --instance-ids i-1234567890abcdef0`

Wait until instance passes its health checks, which can take minutes:

`aws ec2 wait instance-status-ok --instance-ids i-1234567890abcdef0`

### Add/Remove from Load Balancer

See [Register with Load Balancer](#register-with-load-balancer)

### Stop EC2 Instance

Stop:

`aws ec2 stop-instances --instance-ids i-1234567890abcdef0`

Check:

`aws ec2 describe-instances --instance-ids i-1234567890abcdef0 --query "Reservations[0].Instances[0].State.Name" --output text`

Wait until stopped:

`aws ec2 wait instance-stopped --instance-ids i-1234567890abcdef0`

## Check/Change Instance Type

Check:

`aws ec2 describe-instances --instance-ids i-1234567890abcdef0 --query "Reservations[0].Instances[0].InstanceType" --output text`

Change:

`aws ec2 modify-instance-attribute --instance-id i-1234567890abcdef0 --instance-type "{\"Value\": \"r8i-flex.xlarge\"}"`