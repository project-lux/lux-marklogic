---
name: Performance test template
about: This template represents the tasks needed to run a performance test. Please
  update actual tasks as needed or this template when necessary.
title: Performance Test - scheculed for yyyy-mm-dd
labels: performance, testing
assignees: gigamorph, xinjianguo, clarkepeterf, jffcamp, prowns, kamerynB

---

**Primary objective:** 
Ensure that the performance of the system continues to meet or exceed the performance achieved and replicated via scenario J in June 2023.

**Code and Configuration Changes:**
Provide as needed

**Environment and versions (update as needed):**
TST - Blue or Green (as TST)
MarkLogic 11.0.3 (downgraded from 11.2 early release)
Backend v1.16.0
Middle Tier v1.1.9
Frontend v1.26
Dataset produced on 2024-04-18

**Scenario AH** of the [Perf Test Line Up](https://docs.google.com/spreadsheets/d/1uu6aL7yn047yyiZ4auujpTXnlwm01sgWZQ50ht-X4M4/edit#gid=593469390): our existing dual app server configuration (Scenario J) but with the above-discussed field difference.  The last time Scenario J was tested is documented within https://git.yale.edu/lux-its/marklogic/issues/1033 (internal link).

Key metrics we're targeting (column E / scenario J):

![image](https://github.com/project-lux/lux-marklogic/assets/13734146/a6a5561e-8030-4180-b91d-92d120872db0)

Number of application servers: 2 per node.
Maximum number of concurrent application server threads:

- lux-2: 12 per node for search and related list requests
- lux: 6 per node for all other request types
- total: 18 per node

For more information please see the documentation: [LUX Performance Testing Procedure](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-performance-testing.md)

**Tasks to complete:**
- [ ] QA to smoke test the performance scripts. Confirm all 74 flows run successfully
- [ ] Deploy code to be tested 
- [ ] Disable Blue/Green middle-tier caching.
- [ ] Verify LUX trace events are enabled plus `v8 delay timeout`.
- [ ] Verify no other v8-related trace events is enabled.
- [ ] Smoke test the front end.
- [ ] Xinjian: Start collecting OS-level metrics.
- [ ] Peter: Start collecting middle tier metrics ([getMiddleTierStats.sh](https://git.yale.edu/lux-its/marklogic/blob/main/scripts/getMiddleTierStats.sh))
- [ ] QA: Verify/set ramp-up schedule to 2 simple search VUs, 1 filtered VU, and 1 entity page VU every three minutes until there are 148 users then hold for 15 minutes.
- [ ] QA: Verify scripts point to TST, https://lux-front-tst.collections.yale.edu/
- [ ] Team: Sign off on the above before proceeding.
- [ ] QA: Start performance test
- [ ] Team: check total request count at 10 minutes
- [ ] Team: check total request count at 15 minutes
- [ ] Team: check total request count at 20 minutes
- [ ] QA: Finish performance test

**Data collection** ([Details from procedure](https://github.com/project-lux/lux-marklogic/blob/main/docs/lux-performance-testing.md#collect-data)):

- [ ] Xinjian: Stop collecting OS-level metrics and attach to the ticket
- [ ] Peter: Stop collecting middle-tier metrics and attach to the ticket
- [ ] Xinjian: Collect data from AWS and attach to ticket.
- [ ] TBD: Download the monitoring history (level=raw) and attach to the ticket.
- [ ] TBD: Take screenshots of select monitoring history graphs.
- [ ] TBD: Collect, trim, and attach backend logs to the ticket.
- [ ] TBD: Pull app server queue metrics, attach to the ticket, and record in [Perf: Key Metrics](https://docs.google.com/spreadsheets/d/1uu6aL7yn047yyiZ4auujpTXnlwm01sgWZQ50ht-X4M4/edit#gid=774672157).
- [ ] TBD: Update online spreadsheet tabs with what is known at this point.

**Revert all configuration changes:**

- [ ] Deploy Backend v1.16.0 with the `fullTextSearchRelatedFieldName` build property set to `referencePrimaryName`.
- [ ] Enable middle-tier caching.


**Verify:**

- [ ] Smoke test the front end.

**Analysis:**

- [ ] TBD: Upon receipt, review report from QA and update related portions of the online spreadsheet tabs.
- [ ] TBD: Mine the backend logs?
- [ ] TBD: Determine if the test is valid.
- [ ] TBD: Determine if the performance is acceptable
