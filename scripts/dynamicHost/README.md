# MarkLogic Dynamic Host for LUX

- [MarkLogic Dynamic Host for LUX](#marklogic-dynamic-host-for-lux)
  - [Documentation Outstanding](#documentation-outstanding)
  - [Dynamic Host Feature Notes](#dynamic-host-feature-notes)
  - [Design and Implementation Status](#design-and-implementation-status)
    - [EC2 Instance](#ec2-instance)
    - [Dynamic Host AMI](#dynamic-host-ami)
    - [Dynamic Host ASG](#dynamic-host-asg)
    - [Scale-Out](#scale-out)
      - [Monitor \& Initiate](#monitor--initiate)
      - [Join the Cluster](#join-the-cluster)
      - [Register with Load Balancer](#register-with-load-balancer)
    - [Scale-In](#scale-in)
      - [Monitor \& Initiate](#monitor--initiate-1)
      - [Deregister with Load Balancer](#deregister-with-load-balancer)
      - [Leave the Cluster](#leave-the-cluster)
      - [Destroy the Dynamic Host](#destroy-the-dynamic-host)
    - [Licensing Compliance](#licensing-compliance)
  - [Alternative Implementation Options](#alternative-implementation-options)
    - [Standby EC2 Instance](#standby-ec2-instance)
  - [Intermediary Means](#intermediary-means)
    - [Start Pre-Existing EC2 instance](#start-pre-existing-ec2-instance)
    - [Add/Remove from Load Balancer](#addremove-from-load-balancer)
    - [Stop EC2 Instance](#stop-ec2-instance)
  - [Check/Change Instance Type](#checkchange-instance-type)

## Documentation Outstanding

1. List of open questions.
2. Any additional [Alternative Implementation Options](#alternative-implementation-options)?

## Dynamic Host Feature Notes

[MarkLogic's dynamic evaluator host feature](https://docs.progress.com/bundle/marklogic-server-administrate-12/page/topics/dynamic-hosts.html) requires MarkLogic be installed but not initialized.  It cannot start with a data directory.  [resetLocalDynamicHost.sh](./resetLocalDynamicHost.sh) was created while testing scale-out and shows what needed to be done between two scale-out events.

## Design and Implementation Status

### EC2 Instance

The scale-out ec2 instance need only be the `xlarge` cut of the bootstrap host type, which is 1/8th the level of system resources as the bootstrap host.

The bootstrap host held up through arrival rate 150 (272 req/s), of the stress test.  With the dynamic host:

* The hard error rate stayed below 5% arrival rate 420 (650 req/s).
* Most soft error rates were on par with those from arrival rate 150.
* Average request duration increased from 5.5s at 150 to 7s at 420.
* No bottleneck identified in the dynamic host.

Intel, wanted but tested due to it not being available AWS AZ us-east-1a where .111 and its EBS storage were located:

* `m8i-flex.8xlarge` as bootstrap host:  $1,174, 3.9 GHz, 32 vCPUs (16 cores), and 128 GB RAM
* `m8i-flex.xlarge` as dynamic host: $147, 3.9 GHz, 4 vCPUs (2 cores), and 16 GB RAM

Intel, tested with scale-out:

* `m6i.8xlarge` as bootstrap host: $1,121, 3.5 GHz, 32 vCPUs (16 cores), and 128 GB RAM
* `m6i.xlarge` as dynamic host: $140, 3.5 GHz, 4 vCPUs (2 cores), and 16 GB RAM

Graviton, tested without scale-out:

* `m8g.8xlarge` as bootstrap host: $1,048, 2.8 GHz, 32 vCPUs (32 cores), and 128 GB RAM
* `m8g.xlarge` as dynamic host: $131, 2.8 GHz, 4 vCPUs (4 cores), and 16 GB RAM

### Dynamic Host AMI

**Implementation status:** not started

**Ticket(s):**

We will want to maintain an image (AMI) that the dynamic host is to start from.  It should have identical configuration as the bootstrap host with two exceptions:

1. MarkLogic should be installed, but not initialized.
2. No EBS volume.

We only need to update the AMI when there are OS updates, changes to OS settings, or software version changes.  We do not need to update the AMI after loading a new dataset or a typical backend deployment (e.g., changes to configuration *within* MarkLogic or updates to the modules).

To be determined if the creation thereof is as simply as:

1. Creating AMI of Green or Blue less its EBS volume.
2. Updating the [Dynamic Host ASG](#dynamic-host-asg) to use the new AMI.
3. Retention policy for previous AMIs.

### Dynamic Host ASG

**Implementation status:** not started

**Ticket(s):**

Introduce a second Auto Scaling Group (ASG) to the existing load balancer, dedicated to the dynamic host.  The dynamic host ASG is to be associated to the [Dynamic Host AMI](#dynamic-host-ami), the `xlarge` cut of PRD's EC2 instance type, with an initial number of instances of zero.

### Scale-Out

#### Monitor & Initiate

**Implementation status:** not started

**Ticket(s):**

Use AWS CloudWatch metrics and alarms to monitor CPU and memory utilization and initiate a scale-out.  Set a threshold for the system resources.  Use "evaluation periods" and "datapoints to alarm" to require at least one of the system resources to exceed its threshold for minutes before initiating the scale-out.

The alarm is to set the number of EC2 instances on the [Dynamic Host ASG](#dynamic-host-asg) to one.  To avoid a double scale out, it is not to increase the number of instances by one.  Always set to one.

#### Join the Cluster

**Implementation status:** script requires review and invocable during scale-out event.

**Ticket(s):**

[addDynamicHost.sh](./addDynamicHost.sh) was created while testing the scale-out.  It implements the required portions and best security practices of the dynamic host feature.  Excerpt from the script:

```bash
# This script adds a dynamic host to a MarkLogic cluster by:
# 1. Installing MarkLogic on the dynamic host via SSH and SCP (optional, can be skipped)
# 2. Temporarily enabling dynamic hosts on the bootstrap host
# 3. Temporarily enabling API token authentication on the bootstrap host
# 4. Generating a dynamic host token from the bootstrap host
# 5. Directly joining the dynamic host to the cluster using the token
# 6. Revoking the token, disabling API token authentication, and disabling dynamic hosts for security
# 7. Verifying the dynamic host was accepted by the cluster
```

This is the script we will want to run once the dynamic host is running.  We will want to utilize the script's exit code to know if the script was successful.  

Monitoring:

* If the script is executed from the bootstrap host and the script is unable to add the dynamic host, it will write "Unable to add dynamic host" to /var/opt/MarkLogic/Logs/ErrorLog.txt, which we should monitor for and alert the team via email.  This can be configured in the [log monitoring configuration spreadsheet](https://docs.google.com/spreadsheets/d/1uu6aL7yn047yyiZ4auujpTXnlwm01sgWZQ50ht-X4M4/edit?gid=1743835316#gid=1743835316) and pushed out via existing terraform.
* We need to start monitoring for "Starting MarkLogic" in ErrorLog.txt.  Should this happen while a dynamic host is active, the bootstrap host will not automatically reconnect.  When this alert comes in, we will need to:
    * Use [GET /manage/v2/hosts](https://docs.marklogic.com/12.0/REST/GET/manage/v2/hosts) to determine if bootstrap host still has any knowledge of a dynamic host, and if so, use [DELETE /manage/v2/clusters/{id|name}/dynamic-hosts](https://docs.marklogic.com/12.0/REST/DELETE/manage/v2/clusters/[id-or-name]/dynamic-hosts) to permanently remove the dynamic host.
    * Determine if there is a dynamic host and if so, destroy its ec2 instance.  We will need to test to see if [GET /manage/v2/hosts](https://docs.marklogic.com/12.0/REST/GET/manage/v2/hosts) identifies the dynamic host after the bootstrap host has been restarted while the dynamic host was connected.
    * Rely on the scale-out monitoring to re-initiate scale-out, should the bootstrap host exceed one of its system resource utilization thresholds for a sufficient period.  Alternatively, we could extend this alarm action to immediately initiate the scale-out, which would take minutes off getting a dynamic host in play.  May need to take precautions to avoid a race condition with the scale-out monitoring.

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

**Implementation status:** option to use [updateLoadBalancer.sh](./updateLoadBalancer.sh), which would need to be invocable during scale-out event.

**Ticket(s):**

After the dynamic host is in the cluster, we need to register it with the load balancer such that the dynamic host starts to receive requests.  The cluster tested well by sending half of the requests to each host.  Additional details are in the [EC2 Instance](#ec2-instance) section.

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

### Scale-In

The scale-in process should closely align with the scale-out process, but backwards.

#### Monitor & Initiate

**Implementation status:** not started

**Ticket(s):**

Use AWS CloudWatch metrics and alarms to monitor CPU and memory utilization and initiate a scale-in.  Set a threshold for the system resources.  Use "evaluation periods" and "datapoints to alarm" to require **both** of the system resources to be below their thresholds for minutes before initiating the scale-in.

#### Deregister with Load Balancer

**Implementation status:** [updateLoadBalancer.sh](./updateLoadBalancer.sh) may be used as a leg up, but needs to be invocable by the process orchestrating the scale-in event.

**Ticket(s):**

On scale-in, rely on deregistration delay (connection draining) so in flight requests finish cleanly. Configure this on the target group.  The default is 300s, but 60s ought to be sufficient.

[updateLoadBalancer.sh](./updateLoadBalancer.sh) supports deregister but does not override the deregistration delay.

The orchestrating process should wait for the deregistration to delay before proceeding.

#### Leave the Cluster

**Implementation status:** not started

**Ticket(s):**

[DELETE /manage/v2/clusters/{id|name}/dynamic-hosts](https://docs.marklogic.com/12.0/REST/DELETE/manage/v2/clusters/[id-or-name]/dynamic-hosts) may be used to permanently remove a dynamic host from a cluster.

It should not be removed until it has had a chance to complete its in flight requests (i.e., after the load balancer deregistration delay).

If the calling context cannot identify the dynamic host for the DELETE request, we should be able to identify it from [GET /manage/v2/hosts](https://docs.marklogic.com/12.0/REST/GET/manage/v2/hosts), which is what [addDynamicHost.sh](./addDynamicHost.sh) uses to verify whether the dynamic host was successfully added.

#### Destroy the Dynamic Host

**Implementation status:** not started

**Ticket(s):**

Once the dynamic host is removed from the cluster, the process orchestrating the scale-in event is to destroy the dynamic host by setting the number of instances on the [Dynamic Host ASG](#dynamic-host-asg) to zero.

### Licensing Compliance

Starting in Oct 2026, licensing for the dynamic host is limited by total duration used for the year.  We will need to see our auto scaling implementation in action with production replay to get a sense of whether we need to implement controls or simply confirm we're good on an annual basis.

## Alternative Implementation Options

### Standby EC2 Instance

**Pro(s):** Reduced scale-out duration.  Not yet quantified.

**Con(s):** EC2 instance needs to be reset in advance of next scale-out event.

An alternative to [Dynamic Host AMI](#dynamic-host-ami) and a second ASG would be to keep the dynamic host's EC2 instance around.  The scale-out alarm action could start the EC2 instance then move on to [Join the Cluster](#join-the-cluster).

The scale-in alarm action would then need to either reset the instance

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