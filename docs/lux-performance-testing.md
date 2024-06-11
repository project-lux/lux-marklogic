## **LUX Performance Testing Procedure**

- [Create an Issue](#create-an-issue)
- [Verify Backend Trace Events are Enabled](#verify-backend-trace-events-are-enabled)
- [Disable Middle Tier Caching](#disable-middle-tier-caching)
- [Start Collecting OS-Level Metrics](#start-collecting-os-level-metrics)
- [Start Monitoring the Backend Nodes (Optional)](#start-monitoring-the-backend-nodes-optional)
- [Run Performance Test](#run-performance-test)
- [Early-On Backend Request Count Checks](#early-on-backend-request-count-checks)
- [Check ErrorLog.txt Files Throughout](#check-errorlogtxt-files-throughout)
- [Stop Collecting OS-Level Metrics](#stop-collecting-os-level-metrics)
- [Enable Middle Tier Caching](#enable-middle-tier-caching)
- [Collect Data](#collect-data)
  - [AWS](#aws)
    - [Frontend](#frontend)
    - [Middle Tier](#middle-tier)
    - [Web Cache](#web-cache)
    - [ALB](#alb)
    - [Backend](#backend)
  - [Backend Monitoring History](#backend-monitoring-history)
  - [Logs](#logs)
- [Analyze Data](#analyze-data)
  - [AWS](#aws-1)
  - [Backend Monitoring History](#backend-monitoring-history-1)
  - [Backend Logs](#backend-logs)
  - [OS Logs](#os-logs)

# Create an Issue

Using the performance test issue template, create an issue to capture the context and details of the performance test.

The template should do a pretty good job prompting for context but should you think of additional relevant details, please include them.

Update the new ticket as you go.  The procedure in the template includes steps of what to collect.

# Verify Backend Trace Events are Enabled

Verify the backend trace events that should always be enabled are indeed enabled --this includes "v8 delay timeout".  The LUX trace events are the primary source of input for the [backend's log mining script](/scripts/logAnalysis/mineBackendLogs.sh).

For more information, see [Trace Events](/docs/lux-backend-deployment.md#trace-events).

# Disable Middle Tier Caching

- Open Jenkins https://cicd.internal.yale.edu/job/DAM/
- Click dev_test_installs
- Click LUX Web Cache - [env] deploy
- Click the latest build and confirm the value for parameter NO_CACHING is true; if yes, stop; if no, continue.
- Open Configure, change the Default Value of parameter NO_CACHING to true, and Save
- Build with Parameters

# Start Collecting OS-Level Metrics

Run the following on each MarkLogic node in the environment being tested.  It collects both CPU and Memory usages from the outputs of the `sar` command every 10 seconds.

`nohup sudo sar -u -r -o /tmp/sar_${HOSTNAME}_$(date +"%Y-%m-%dT%H%M%S").out 10 >/tmp/sar_${HOSTNAME}_$(date +"%Y-%m-%dT%H%M%S")_screen.out 2>&1 &`

where -u is to capture CPU usage and -r is to capture Memory usage, the first .out file is in binary format requiring sar viewer to read, while the second .out file is in text format and can be viewed with any text viewing tool.

# Start Monitoring the Backend Nodes (Optional)

Optionally, while the performance test is running, one may connect to each MarkLogic node via SSH, run top command to monitor CPU utilization and load, and capture a screenshot or two.

Note though that the `sar` command is collecting CPU utilization percents for user processes, nice, system, I/O wait, steal, and idle --and that visualization options exist.

# Run Performance Test

Request QA to run the performance test.

# Early-On Backend Request Count Checks

Checking the backend request count a few times early on in the test is a way to gain confidence the test is configured as expected.  There are two related scripts:

* [/scripts/logAnalysis/checkRequestCount.sh](/scripts/logAnalysis/checkRequestCount.sh): This is the primary script that one runs locally after configuring to the target MarkLogic cluster.
* [/scripts/logAnalysis/trimLocalRequestLogs.sh](/scripts/logAnalysis/trimLocalRequestLogs.sh): This script needs to be deployed on each MarkLogic node.  Please see the script for details.

The idea is to run this script 10, 15, and 20 minutes into the test and compare those counts to those of the baseline test.

# Check ErrorLog.txt Files Throughout

Throughout the test, one may use [/scripts/logAnalysis/checkErrorLogs.sh](/scripts/logAnalysis/checkErrorLogs.sh) to view select information.  The script offers two modes: 

* `restarts`: see if one of the MarkLogic processes restarted.
* `warnAndAbove`: entries that have a severity of warning or higher.

Please see the script for configuration and usage details.  And feel free to add additional modes!

# Stop Collecting OS-Level Metrics

When the test has completed, use `Ctrl-C` or `kill` to stop the `sar` process on each node.

# Enable Middle Tier Caching

- Open Jenkins https://cicd.internal.yale.edu/job/DAM/
- Click dev_test_installs
- Click LUX Web Cache - [env] deploy
- Click the latest build and confirm the value for parameter NO_CACHING is false; if yes, stop; if no, continue.
- Open Configure, change the Default Value of parameter NO_CACHING to false, and Save
- Build with Parameters

# Collect Data

## AWS

Historically, the following has been collected into a single document and attached to the ticket.

### Frontend
Login to AWS console, open Elastic Container Service, find the cluster for the environment [env]-lux, click service name [env]-lux-frontend, click on Metrics tab, click CPUUtilization, select sample range, change Period to 5 seconds, capture the final graph. Repeat this for MemoryUtilization.

### Middle Tier
Login to AWS console, open Elastic Container Service, find the cluster for the environment [env]-lux, click service name [env]-lux-backend, click on Metrics tab, click CPUUtilization, select sample range, change Period to 5 seconds, capture the final graph. Repeat this for MemoryUtilization.

### Web Cache
Login to AWS console, open Elastic Container Service, find the cluster for the environment [env]-lux, click service name [env]-lux-webcache, click on Metrics tab, click CPUUtilization, select sample range, change Period to 5 seconds, capture the final graph. Repeat this for MemoryUtilization.

### ALB
Login to AWS console, open EC2 service, open Load Balancers, find the balancer for the environment, click on the name to open its details page, click on Monitoring tab, expand the Target Response Time graph, change sampling interval to 5 seconds, select the time range, capture the graph.

Repeat the above for ALB Requests.

### Backend
Login to AWS console, open EC2 service, open Instances(running), select all three nodes of the cluster [env]-lux-marklogic-ec2 for the environment, expand the CPU utilization graph, change sampling interval to 5 seconds, select the time range, capture the graph.

## Backend Monitoring History

Within MarkLogic's Monitoring app, set the start and end time to roughly five minutes before and after the performance test.  Select 'raw' for the period.  Select the time span's refresh button.

![Performance Monitoring Settings](/docs/img/monitoring-history-perf-test.png)

One category at a time (e.g., CPU), click the blue arrow to go into its detailed view and:

1. Take a screenshot.
    *  It can be helpful to display the ML node key for one of the graphs in the screenshot.
    *  For some, you may wish to apply some filters, such as only the `lux-request-group-1` and `lux-request-group-2` app servers and lux-content database.
    *  Omitted graphs are presumed to have no activity.
    *  See [example](https://github.com/project-lux/lux-marklogic/issues/162#issuecomment-2158369404).
2. Click the export link.
3. Move on to the next category.

Once you have all the exports, attach them to the ticket.  See [example](https://github.com/project-lux/lux-marklogic/issues/162#issuecomment-2158386057).

## Logs

On each node, collect:

1. The sar log: `/tmp/sar_${HOSTNAME}_$(date -Iseconds).out`
2. The following from within `/var/opt/MarkLogic/Logs`:
    * ErrorLog.txt
    * 8003_ErrorLog.txt
    * 8003_RequestLog.txt
3. Add the last portion of the IP address to each of the MarkLogic filenames.
4. Trim the logs to the test period.
5. Compress and attach to the ticket.

**Do the other tiers have any logs we should capture?**

# Analyze Data

## AWS

Data collected from AWS is typically shared in advance and presented at the performance test results meeting.

## Backend Monitoring History

Data collected from MarkLogic's monitoring history is typically shared in advanced and presented at the performance test results meeting.

As an alternative to exporting metering data as a spreadsheet from the console, the [Exporting Metering Data KB article](https://help.marklogic.com/Knowledgebase/Article/View/530/0/exporting-metering-data) offers a couple ways to export the raw data files.

## Backend Logs

The backend logs need to be run through a log mining script to produce what should then be analyzed and shared.

1. If not yet done, trim the logs collected from `/var/opt/MarkLogic/Logs` to the test period.
2. Provide the trimmed logs as input to [/scripts/logAnalysis/mineBackendLogs.sh](/scripts/logAnalysis/mineBackendLogs.sh).
3. Save and format each CSV as XLSX.
4. Optionally create some charts.  Now that you have the data, you can create them later.
5. Review each of the script's output files.
6. Provide a summary (with charts) in the ticket.
7. Attach the script's output files to the ticket, including the XLSX files.

## OS Logs

We are using `sar` to capture OS-level metrics within the MarkLogic cluster, and anticipate this will provide additional insights on how implementation patterns perform at scale.

To view the output: `sar -f [filename]`

Consider using the likes of https://github.com/vlsi/ksar (fork of https://sourceforge.net/projects/ksar/) to visualize/graph the output.
