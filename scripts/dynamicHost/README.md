# MarkLogic Dynamic Host for LUX

- [MarkLogic Dynamic Host for LUX](#marklogic-dynamic-host-for-lux)
  - [Dynamic Host Feature Notes](#dynamic-host-feature-notes)
  - [Design and Implementation Status](#design-and-implementation-status)
    - [EC2 Instance](#ec2-instance)
    - [Dynamic Host AMI](#dynamic-host-ami)
    - [Dynamic Host ASG](#dynamic-host-asg)
    - [Application Load Balancer (ALB)](#application-load-balancer-alb)
    - [Scale-Out](#scale-out)
      - [Monitor \& Initiate](#monitor--initiate)
      - [Join the Cluster](#join-the-cluster)
    - [Scale-In](#scale-in)
      - [Monitor \& Initiate](#monitor--initiate-1)
      - [Leave the Cluster](#leave-the-cluster)
    - [Licensing Compliance](#licensing-compliance)
  - [Alternative Implementation Options](#alternative-implementation-options)
    - [Standby EC2 Instance](#standby-ec2-instance)
    - [Immediate Rejoin Restarted Cluster](#immediate-rejoin-restarted-cluster)
  - [Intermediary Means](#intermediary-means)
    - [Start Pre-Existing EC2 instance](#start-pre-existing-ec2-instance)
    - [Add/Remove from Load Balancer](#addremove-from-load-balancer)
    - [Stop EC2 Instance](#stop-ec2-instance)
  - [Check/Change Instance Type](#checkchange-instance-type)

## Dynamic Host Feature Notes

[MarkLogic's dynamic evaluator host feature](https://docs.progress.com/bundle/marklogic-server-administrate-12/page/topics/dynamic-hosts.html) highlights:

* Dynamic hosts evaluate queries only.  They do not host forests and do not enable forest-level failover.
* Requires MarkLogic be installed on the dynamic host but not initialized.  It cannot start with a data directory.  [resetLocalDynamicHost.sh](./resetLocalDynamicHost.sh) was created while testing scale-out and shows what needed to be done between two scale-out events.
* When all permanent hosts in a cluster restart, any dynamic hosts are disconnected and do not automatically reconnect.  Since LUX will only have one permanent host, the design discusses a couple of options.

The [Join the Cluster](#join-the-cluster) section references a script that implements the process of adding running EC2 instance to a MarkLogic cluster, as a dynamic host.  It makes the required changes on both the bootstrap and dynamic hosts.

## Design and Implementation Status

### EC2 Instance

The dynamic host EC2 instance need only be the `xlarge` cut of the bootstrap host type, which is 1/8th the level of system resources as the bootstrap host.

The bootstrap host held up through arrival rate 150 (272 req/s), of the stress test.  With the dynamic host:

* The hard error rate stayed below 5% arrival rate 420 (650 req/s).
* Most soft error rates were on par with those from arrival rate 150.
* Average request duration increased from 5.5s at 150 to 7s at 420.
* No bottleneck identified in the dynamic host.

Intel, wanted but tested due to it not being available AWS AZ us-east-1a where .111 and its EBS storage were located:

* `m8i-flex.8xlarge` as bootstrap host:  $1,174, 3.9 GHz, 32 vCPUs (16 cores), and 128 GB RAM
* `m8i-flex.xlarge` as dynamic host: $147, 3.9 GHz, 4 vCPUs (2 cores), and 16 GB RAM

Intel, tested with dynamic host:

* `m6i.8xlarge` as bootstrap host: $1,121, 3.5 GHz, 32 vCPUs (16 cores), and 128 GB RAM
* `m6i.xlarge` as dynamic host: $140, 3.5 GHz, 4 vCPUs (2 cores), and 16 GB RAM

Graviton, tested without dynamic host:

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

We intend to utilize the ASG's [lifecycle hooks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html), Lambda functions, and 1-2 new MarkLogic endpoints to [Join the Cluster](#join-the-cluster) and [Leave the Cluster](#leave-the-cluster).  

ASG lifecycle hooks change the paradigm away from having a single orchestrating process.

### Application Load Balancer (ALB)

The ALB is to be configured with two ASGs.  One for the bootstrap host and another for the dynamic host.  This allows us to:

1. Have different AMIs for the two host types.
    * The bootstrap host should have an EBS volume.
    * The dynamic host should not.
2. Use different EC2 instance types.
    * The bootstrap host should use an `8xlarge` instance type.
    * The dynamic host should use the `xlarge` instance type of the same family.

The ALB only requires one target group, which both ASGs are to use.

The ALB is to send an even number of requests between the two hosts.  The cluster tested well by sending half of the requests to each host.  Additional details are in the [EC2 Instance](#ec2-instance) section.

### Scale-Out

Possible components and sequence, which are detailed in the following sections:

1. Scale-out alarm activates the ASG scaling policy's lifecycle hook (Pending:Wait).
2. The number of instances for the [Dynamic Host ASG](#dynamic-host-asg) has been changed to one.
3. The lifecycle hook uses EventBridge to execute a Lambda function.
4. The Lambda function consumes a MarkLogic endpoint responsible for configuring a running EC2 instance into a connected dynamic host.
5. CompleteLifecycleAction fires and the ALB starts checking performing its health check against the dynamic host.
6. Once the dynamic host passes its health check, the ALB starts routing requests to it.

#### Monitor & Initiate

**Implementation status:** not started

**Ticket(s):**

Use AWS CloudWatch metrics and alarms to monitor CPU and memory utilization and initiate a scale-out.  Set a threshold for the system resources.  Use **EvaluationPeriods** and **DatapointsToAlarm** to require at least one of the system resources to exceed its threshold M-of-N consecutive datapoints before initiating the scale-out.  Note that memory is not monitored by default and requires the **CloudWatch Agent**.

The alarm is to set the number of EC2 instances on the [Dynamic Host ASG](#dynamic-host-asg) to one.  To avoid a double scale-out, it is not to increase the number of instances by one.  Always set to one.  

We may implement this using the ASG's "simple scaling" mode plus a cooldown period.

To be verified:

> **Simple scaling** waits for any in progress scaling and the **cooldown** to finish before acting on another alarm, effectively preventing back to back scale-outs unless the alarm transitions back to **OK** and then **ALARM** again. Configure the **ASG default cooldown** (e.g., several minutes longer than your instance warmup/bootstrap). 
>    * [Simple scaling policies](https://docs.aws.amazon.com/autoscaling/ec2/userguide/simple-scaling-policies.html)
>    * SO: [How do 'Health Check Grace Period' and 'Default Cooldown' in AWS autoscaling work?](https://stackoverflow.com/questions/55872117/how-do-health-check-grace-period-and-default-cooldown-in-aws-autoscaling-wor)

By relying on the ASG, we no longer need to register the dynamic host with the load balancer, making [updateLoadBalancer.sh](./updateLoadBalancer.sh) obsolete.

#### Join the Cluster

**Implementation status:** not started.  Need to develop the endpoint, which is to be consumed starting the dynamic host's EC2 instance.

**Ticket(s):**

We need to utilize the **Pending:Wait** lifecycle hook to add the dynamic host to the cluster.  The hook is to use EventBridge to execute a Lambda function.  That function is to consume a new MarkLogic endpoint responsible for configuring a running EC2 instance into a connected dynamic host.

The design calls for converting a subset of [addDynamicHost.sh](./addDynamicHost.sh) into MarkLogic server-side code, deployed to the bootstrap host and exposed via REST endpoint.  The subset of functionality we need is:

1. Generating a dynamic host token using `admin.issueDynamicHostToken`.
2. Initialize the dynamic host using the token by consuming the `/admin/v1/init` endpoint on the dynamic host.  For a bash script example of this, start at line 685 of [addDynamicHost.sh](./addDynamicHost.sh).
3. Invalidate the token using `admin.revokeDynamicHostToken`.
4. Verify the dynamic host connected to the bootstrap host using `xdmp.getDynamicHosts`.
5. Log "Unable to add dynamic host" to the application server's error log (e.g., 8003_ErrorLog.txt) when the server-side code experiences an error or is unable to verify the dynamic host connected.

We do not plan to temporarily enable the addition of dynamic hosts and API authentication.  Rather, we are to enable using ML Gradle and leave them enabled.

To consume the endpoint, the Lambda function will need to provide MarkLogic user credentials that have sufficient execute privileges.  The implementation could be encapsulated in an amp'd function to avoid requiring the admin role.  The Lambda function must also provide the IP address of the dynamic host.

**Monitoring Considerations:**

* Monitor for and alert the team via email when "Unable to add dynamic host" appears in the application error log.  We may wish to monitor in both 8003_ErrorLog.txt and 8006_ErrorLog.txt.  This can be configured in the [log monitoring configuration spreadsheet](https://docs.google.com/spreadsheets/d/1uu6aL7yn047yyiZ4auujpTXnlwm01sgWZQ50ht-X4M4/edit?gid=1743835316#gid=1743835316) and pushed out via existing terraform.
* We would need a configure a cluster restart alarm to "Starting MarkLogic" in the bootstrap host's ErrorLog.txt.  As first mentioned in the [Dynamic Host Feature Notes](#dynamic-host-feature-notes) section, dynamic hosts are disconnected when a cluster made up of a single permanent host is restarted.  This alarm's action may need to:
    * Use [GET /manage/v2/hosts](https://docs.marklogic.com/12.0/REST/GET/manage/v2/hosts) to determine if bootstrap host still has any knowledge of a dynamic host, and if so, use [DELETE /manage/v2/clusters/{id|name}/dynamic-hosts](https://docs.marklogic.com/12.0/REST/DELETE/manage/v2/clusters/[id-or-name]/dynamic-hosts) to permanently remove the dynamic host.
    * Determine if there is a dynamic host and if so, complete relevant portions of the [Scale-In](#scale-in) process.  We will need to test to see if [GET /manage/v2/hosts](https://docs.marklogic.com/12.0/REST/GET/manage/v2/hosts) identifies the dynamic host after the bootstrap host has been restarted while the dynamic host was connected.
    * Rely on the scale-out monitoring to re-initiate scale-out, should the bootstrap host exceed one of its system resource utilization thresholds for a sufficient period.  For an alternative that would allow the dynamic host to resume processing requests sooner, see [Immediate Rejoin Restarted Cluster](#immediate-rejoin-restarted-cluster).
* When connected, the dynamic host will write its own MarkLogic logs.  We need to decide if we will stream and monitor them in CloudWatch.

### Scale-In

The scale-in process should closely align with the scale-out process, but backwards:

1. Scale-in alarm activates the ASG scaling policy's lifecycle hook (Terminating:Wait).
2. The number of instances for the [Dynamic Host ASG](#dynamic-host-asg) has been set to zero.
3. Utilize the ASG's deregistration delay to allow the dynamic host's in flight requests to complete. 
4. The lifecycle hook then uses EventBridge to execute a Lambda function.
5. The Lambda function consumes a MarkLogic endpoint for the dynamic node to [Leave the Cluster](#leave-the-cluster).

#### Monitor & Initiate

**Implementation status:** not started

**Ticket(s):**

Use AWS CloudWatch metrics and alarms to monitor CPU and memory utilization and initiate a scale-in.  Set a threshold for the system resources.  Use **EvaluationPeriods** and **DatapointsToAlarm** to require **both** of the system resources to be below their thresholds for minutes before initiating the scale-in.

The alarm is to set the number of EC2 instances on the [Dynamic Host ASG](#dynamic-host-asg) to zero and utilize its deregistration delay setting to allow the dynamic host to complete in flight requests.

By relying on the ASG, we no longer need to deregister the dynamic host from the load balancer, making [updateLoadBalancer.sh](./updateLoadBalancer.sh) obsolete.

#### Leave the Cluster

**Implementation status:** not started.  Need a new MarkLogic endpoint to consume when terminating the dynamic host's EC2 instance.

**Ticket(s):**

We need to utilize the **Terminating:Wait** lifecycle hook to remove the dynamic host from the cluster.  This is another spot where we can use EventBridge and Lambda to consume a new MarkLogic endpoint.  The server-side code is to use `xdmp.removeDynamicHosts` to disconnect and remove the dynamic host.

The Lambda function will need to provide MarkLogic user credentials with sufficient privileges, but not the dynamic host's IP address.

TBD if there will be a single endpoint that supports adding and removing a dynamic host.  This can be decided during the implementation phase.

### Licensing Compliance

Starting in Oct 2026, licensing for the dynamic host is limited by total duration used for the year.  We will need to see our auto scaling implementation in action with production replay to get a sense of whether we need to implement controls or simply confirm we're good on an annual basis.

## Alternative Implementation Options

### Standby EC2 Instance

**Pro(s):** Reduced scale-out duration.  Not yet quantified.

**Con(s):** EC2 instance needs to be reset in advance of next scale-out event.

An alternative to [Dynamic Host AMI](#dynamic-host-ami) and a second ASG would be to keep the dynamic host's EC2 instance around.  The scale-out alarm action could start the EC2 instance then move on to [Join the Cluster](#join-the-cluster).

The scale-in or scale-out alarm action would then need reset the instance, which may only require deleting the `/var/opt/MarkLogic` directory on the dynamic host.

Yet another take on this is having the second ASG and utilizing its [warm pool](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html).

### Immediate Rejoin Restarted Cluster

**Pro(s):** Dynamic host to resume processing requests sooner.

**Con(s):** Would require the cluster restart alarm action to initiate the scale-out process and ensure doing so does not result in a race condition with the scale-out alarm's action.

As discussed in the [Join the Cluster](#join-the-cluster) section, a cluster-wide restart disconnects any dynamic hosts and they are not automatically reconnected.  If we rely on our scale-out alarm to determine whether the dynamic host is still needed, it could add minutes (not verified) to the process.  Alternatively, we could extend the cluster restart alarm action to initiate the scale-out event immediately after the scale-in event completes.  There may be an opportunity to combine/optimize the two processes.  We should also ensure this cannot result in adding two dynamic hosts.

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

During testing, after the dynamic host is in the cluster, we registered it with the load balancer such that the dynamic host starts to receive requests.  Given our intended use of a [Dynamic Host ASG](#dynamic-host-asg), we will not need to manually script this part.  Same for deregistration.

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