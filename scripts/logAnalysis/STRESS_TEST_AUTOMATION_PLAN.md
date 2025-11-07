# Stress Test Analysis Automation - Implementation Plan

## Context Summary

We're creating an automated stress test analysis system to replace manual log analysis workflows. The system will:
- Eliminate hardcoded values in existing scripts (collectBackendLogs.sh, trimBackendLogs.sh, mineBackendLogs.sh)
- Automate collection and analysis of MarkLogic backend logs, meters data, and system metrics
- Generate reports showing performance by arrival rate (15-90 in increments of 15)
- Correlate restart counts with arrival rates using existing trimBackendLogs.sh activity detection logic

## Agreed Scope

### Phase 1: Configuration-Driven System
Configuration-driven system with YAML configs for environments, test definitions, and analysis rules

### Phase 2 (Modified)
- Automated meters analysis (exportMeters.xqy parsing)
- Simple restart counting by arrival rate (not enhanced root cause analysis)
- Port routing validation across request types
- System metrics integration (sar + network tools)

### Phase 4 (Subset)
Basic reporting dashboard showing backend perspective with arrival rate breakdowns

## Current State

- **Repository**: `lux-marklogic` on branch `log-script-improvements`
- **Working Directory**: `c:\workspaces\yale\clones\lux-marklogic\scripts\logAnalysis\`
- **Existing Scripts Analyzed**: executeInSubDirs.sh, collectBackendLogs.sh, trimBackendLogs.sh, mineBackendLogs.sh, exportMeters.xqy

## Next Steps to Implement

1. **Create configuration structure** in `scripts/stress-test-analyzer/config/`
2. **Build configuration-driven wrappers** for existing collection scripts
3. **Implement arrival rate detection** using trimBackendLogs.sh logic
4. **Create restart counter** that maps restarts to detected arrival rate periods
5. **Build basic meters data parser** for exportMeters.xqy output
6. **Generate initial HTML report** with arrival rate breakdowns

## Key Technical Details

### Analysis Patterns
- **Restart counting**: `grep -c "Starting Mark" *ErrorLog*` per arrival rate period
- **Port routing patterns**: swap "read.mjs" for different request types
- **Retry analysis**: `grep -c "requests\":[^1]" *RequestLog*` with breakdown by retry count

### Activity Detection
- Use existing trimBackendLogs.sh auto-detection logic for identifying activity periods
- Arrival rate detection: periods identified by start of arrival rate 15, end of arrival rate 90
- Leverage trimBackendLogs.sh existing logic for determining periods of activity within a range

### Proposed Directory Structure
```
scripts/stress-test-analyzer/
├── config/
│   ├── environments.yml      # IPs, credentials, PEM files by environment
│   ├── test-definitions.yml  # Arrival rate sequences, time ranges
│   └── analysis-config.yml   # What patterns to search for
├── collectors/
│   ├── log_collector.py      # Wraps existing collection scripts
│   ├── meters_collector.py   # Automates exportMeters.xqy execution
│   └── system_collector.py   # sar, ss/netstat, messages collection
├── analyzers/
│   ├── log_analyzer.py       # Enhanced version of grep patterns
│   ├── meters_analyzer.py    # Parse and correlate meters data
│   └── correlator.py         # Cross-system analysis
└── main.py                   # Orchestrator
```

## Files to Reference When Resuming

- **`executeInSubDirs.sh`** - execution pattern for subdirectory analysis
- **`trimBackendLogs.sh`** - auto-detection algorithm (lines ~25-100 for range detection)
- **`collectBackendLogs.sh`** - configuration pattern to replicate  
- **`exportMeters.xqy`** - meters export structure

## Current Analysis Workflow (Manual)

1. Ask for middle tier retry evidence (screenshots)
2. Retrieve logs: `collectBackendLogs.sh` (requires manual IP/config editing)
3. Trim logs: `trimBackendLogs.sh` (auto-detects activity periods)
4. Mine logs: `mineBackendLogs.sh` + `executeInSubDirs.sh` with various patterns:
   - Document requests: `grep -c "read.mjs" *AccessLog*`
   - MarkLogic restarts: `grep -c "Starting Mark" *ErrorLog*`
   - Request retries: `grep -c "requests\":[^1]" *RequestLog*`
5. Export meters data (manual execution of exportMeters.xqy)
6. Retrieve system logs (/var/log/messages, sar output)
7. Get app server queue metrics (cURL to REST API)

## Implementation Priority

**START HERE**: Create Phase 1 configuration system to eliminate manual script editing and enable automated orchestration of the existing workflow.

---
*Created: November 4, 2025*
*Status: Planning Complete - Ready for Implementation*