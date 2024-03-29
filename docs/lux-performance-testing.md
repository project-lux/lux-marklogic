## **LUX Performance Testing Procedure**

- [Submit a Ticket](#submit-a-ticket)
- [Verify Backend Trace Events are Enabled](#verify-backend-trace-events-are-enabled)
- [Disable Middle Tier Caching](#disable-middle-tier-caching)
- [Start Collecting OS-Level Metrics](#start-collecting-os-level-metrics)
- [Start Monitoring the Backend Nodes (Optional)](#start-monitoring-the-backend-nodes-optional)
- [Run Performance Test](#run-performance-test)
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

# Submit a Ticket

Submit a backend ticket to capture the context and details of the performance test.

Context should include:

1. Versions: dataset, frontend, middle tier, backend (inclusive of indexing configuration), MarkLogic, etc.
2. List any other changes expected to improve or degrade performance, such as specific optimizations or configuration changes.
3. List any other changes to the environment or base software, regardless of anticipated impact to performance.
4. Performance test:
    * In lieu of a version, request a summary of changes that could have a material effect on comparing the test's results to that of a previous run.
    * Document any parameters to the test, such as the ramp up and down of users (e.g., *x* virtual users are added every *y* minutes up to *z* virtual users.)

For an example, search for the most recent performance test ticket.

Update the new ticket as you go.

# Verify Backend Trace Events are Enabled

Verify the backend trace events that should always be enabled are indeed enabled.  These trace events are the primary source of input for the [backend's log mining script](/scripts/logAnalysis/mineBackendLogs.sh).

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

Begin taking screenshots and adding to the ticket.  Be sure to dive ito the detailed view of each section; top-level charts can represent the sum of hosts and/or not display all available charts.  An assumption is that if a chart is excluded, there was either no activity or not change in its activity.

Lastly, click the "export" link in the top-right of the app, attaching that download to the ticket.

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
