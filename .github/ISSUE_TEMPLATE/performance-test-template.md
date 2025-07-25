---
name: Performance test template
about: This template represents the tasks needed to run a performance test. Please
  update actual tasks as needed or this template when necessary.
title: Performance Test - scheduled for yyyy-mm-dd
labels: performance, testing
assignees: gigamorph, xinjianguo, clarkepeterf, jffcamp, prowns, kamerynB

---

## Primary Objective
Identify the scenario in [Perf Test Line Up](https://docs.google.com/spreadsheets/d/1uu6aL7yn047yyiZ4auujpTXnlwm01sgWZQ50ht-X4M4/edit#gid=593469390) and state the primary objective.

## Changes Being Tested
List changes or differences in the code, configuration, environment, etc. that are being tested.  Compare to a baseline.

## Context

### Environment and Versions

- Environment: TST which is configured to the **TODO** backend.
- MarkLogic **TODO**
- Backend **TODO**
- Middle Tier **TODO**
- Frontend**TODO**
- Dataset produced on **TODO**

## Tasks

For more information please see the documentation: [LUX Performance Testing Procedure](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-performance-testing.md)

### Prep, Start, and Preliminary Checks

- [ ] Confirm the most recent blue-green switch is 100% complete (i.e., no part of TST is using PROD).
- [ ] Deploy code and/or configuration changes that are being tested.
- [ ] Disable middle-tier caching in TST ([instructions](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-performance-testing.md#disable-middle-tier-caching)).
- [ ] Verify LUX trace events are enabled plus `v8 delay timeout`.
- [ ] Smoke test the front end.
- [ ] Start collecting OS-level metrics ([instructions](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-performance-testing.md#start-collecting-os-level-metrics)).
- [ ] Start collecting middle tier metrics ([script](https://git.yale.edu/lux-its/marklogic/blob/main/scripts/getMiddleTierStats.sh))
- [ ] QA: Verify/set ramp-up schedule to 2 simple search VUs, 1 filtered VU, and 1 entity page VU every three minutes until there are 148 users then hold for 15 minutes.
- [ ] QA: Verify test is configured with three second wait times.
- [ ] QA: Verify scripts point to TST, https://lux-front-tst.collections.yale.edu/
- [ ] Team: Sign off on the above before proceeding.
- [ ] QA: Start performance test.
- [ ] Team: begin monitoring for v8 engine crashes.
- [ ] Team: check total request count at 10 minutes.
- [ ] Team: check total request count at 15 minutes.
- [ ] Team: check total request count at 20 minutes.
- [ ] QA: Finish performance test.

### Collect data

- [ ] Stop collecting OS-level metrics and attach to the ticket.
- [ ] Stop collecting middle-tier metrics and attach to the ticket.
- [ ] Collect data from AWS and attach to ticket.
- [ ] Collect ML monitoring history ([instructions](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-performance-testing.md#backend-monitoring-history)).
- [ ] Collect ([script](https://github.com/project-lux/lux-marklogic/blob/main/scripts/logAnalysis/collectBackendLogs.sh)), trim ([script](https://github.com/project-lux/lux-marklogic/blob/main/scripts/logAnalysis/trimBackendLogs.sh)), and attach backend logs to the ticket.
- [ ] Pull app server queue metrics ([script](https://github.com/project-lux/lux-marklogic/blob/main/scripts/extractAppServerQueueMetrics.js)), attach to the ticket, and record in [Perf: Key Metrics](https://docs.google.com/spreadsheets/d/1uu6aL7yn047yyiZ4auujpTXnlwm01sgWZQ50ht-X4M4/edit#gid=774672157).  *Starting in ML 11.2.0, this information may be included in the ML monitoring history screenshots and exports.*
- [ ] Update online spreadsheet tabs with what is known at this point.

### Restore and Verify Environment

- [ ] Revert this test's code and configuration changes
- [ ] Enable middle-tier caching ([instructions](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-performance-testing.md#enable-middle-tier-caching)).
- [ ] Smoke test the front end.

### Analyze

- [ ] Upon receipt, review report from QA and update related portions of the online spreadsheet tabs.
- [ ] Mine the backend logs?
- [ ] Determine if the test is valid.
- [ ] Determine if the performance is acceptable.
