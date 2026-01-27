
#!/bin/sh
# Summarize MarkLogic access logs (counts + response bytes by request type)
# Expected format (sample):
# 10.5.152.44 - lux_consumer_sbx [30/Dec/2025:07:00:02 +0000] "POST /ds/lux/search.mjs HTTP/1.1" 200 2631 - -
#
# Usage:
#   ./analyzeByRequestType.sh "*AccessLog*" "2025-12-30T07:00:00" "2025-12-30T08:00:00"
# Optional:
#   DEBUG=1 ./analyzeByRequestType.sh ...

if [ $# -lt 1 ]; then
  echo "Usage: $0 \"<glob-of-log-files>\" [start-iso] [end-iso]"
  echo "  If start-iso and end-iso are omitted, all log entries will be processed"
  echo "  IMPORTANT: Quote the glob pattern to prevent shell expansion!"
  echo "  Example: $0 \"*AccessLog*\" \"2026-01-09T22:15:00\" \"2026-01-09T22:25:00\""
  echo "  Example: $0 \"*AccessLog*\"  # Process all entries"
  exit 1
fi

# Check if first argument looks like a filename instead of a glob pattern
if [ -f "$1" ]; then
  echo "ERROR: First argument appears to be a filename, not a quoted glob pattern."
  echo "Did you forget to quote the glob? Try: $0 \"*AccessLog*\" ..."
  echo "Current arguments: $*"
  exit 1
fi

LOG_GLOB="$1"
START_ISO="${2:-}"
END_ISO="${3:-}"
DEBUG="${DEBUG:-0}"

# Validate ISO timestamp format if provided
if [ -n "$START_ISO" ] && ! echo "$START_ISO" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}$'; then
  echo "ERROR: Invalid start timestamp format: $START_ISO"
  echo "Expected format: YYYY-MM-DDTHH:MM:SS (e.g., 2026-01-09T22:17:59)"
  exit 1
fi

if [ -n "$END_ISO" ] && ! echo "$END_ISO" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}$'; then
  echo "ERROR: Invalid end timestamp format: $END_ISO"
  echo "Expected format: YYYY-MM-DDTHH:MM:SS (e.g., 2026-01-09T22:23:43)"
  exit 1
fi

[ "$DEBUG" = "1" ] && {
  echo "Script arguments:"
  echo "  LOG_GLOB: $LOG_GLOB"
  echo "  START_ISO: $START_ISO"
  echo "  END_ISO: $END_ISO"
  echo
}

# Expand glob (current directory). Adjust path as needed.
FILES=$(find . -maxdepth 1 -type f -name "$LOG_GLOB" 2>/dev/null)
if [ -z "$FILES" ]; then
  echo "No files matched: $LOG_GLOB"
  exit 2
fi

[ "$DEBUG" = "1" ] && {
  echo "Matched files:"
  printf "  %s\n" $FILES
  echo
}

# Only show progress message if output is going to a terminal (not redirected)
[ -t 1 ] && echo "Convincing these logs to spill all their secrets..."

gawk -v start_iso="$START_ISO" -v end_iso="$END_ISO" -v debug="$DEBUG" '
BEGIN{
  # Force UTC for mktime() so ISO and log timestamps align.
  ENVIRON["TZ"]="UTC"
  
  # Check if time filtering is enabled
  use_time_filter = (start_iso != "" && end_iso != "")
}

# --- Helpers ---
function mon2num(m,    i,months) {
  split("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec", months, " ")
  for (i=1; i<=12; i++) if (months[i]==m) return i
  return 0
}
function iso_to_epoch(iso,    Y,M,D,H,Mi,S,parts,dp,tp) {
  split(iso, parts, "T")
  split(parts[1], dp, "-")
  split(parts[2], tp, ":")
  Y=dp[1]; M=dp[2]; D=dp[3]; H=tp[1]; Mi=tp[2]; S=tp[3]
  return mktime(sprintf("%04d %02d %02d %02d %02d %02d", Y, M, D, H, Mi, S))
}
function logts_to_epoch(ts,    dtparts,dt,hms,dmy,day,mon,year,h,mi,s) {
  # ts format: "30/Dec/2025:07:00:02 +0000"
  split(ts, dtparts, " ")
  dt = dtparts[1]
  split(dt, hms, ":")                  # hms[1]="30/Dec/2025", hms[2]=HH, hms[3]=MM, hms[4]=SS
  split(hms[1], dmy, "/")              # dmy[1]=DD, dmy[2]=Mon, dmy[3]=YYYY
  day=dmy[1]; mon=dmy[2]; year=dmy[3]
  h=hms[2]; mi=hms[3]; s=hms[4]
  return mktime(sprintf("%04d %02d %02d %02d %02d %02d", year, mon2num(mon), day, h, mi, s))
}

# --- Classification (tune as needed) ---
function classify(uri,    u) {
  u = tolower(uri)
  if (u ~ /\/ds\/lux\/search\.mjs(\?|$)/)           return "Search"
  if (u ~ /\/ds\/lux\/facets\.mjs(\?|$)/)           return "Facet"
  if (u ~ /\/ds\/lux\/relatedlist\.mjs(\?|$)/)      return "Related List"
  if (u ~ /\/ds\/lux\/searchwillmatch\.mjs(\?|$)/)  return "Search Will Match"
  if (u ~ /\/ds\/lux\/searchestimate\.mjs(\?|$)/)   return "Search Estimate"
  if (u ~ /\/ds\/lux\/document\/read\.mjs(\?|$)/)   return "Document"
  if (u ~ /\/ds\/lux\/translate\.mjs(\?|$)/)        return "Translate"
  return "Other"
}

# --- Init ---
BEGIN{
  if (use_time_filter) {
    start_epoch = iso_to_epoch(start_iso)
    end_epoch   = iso_to_epoch(end_iso)
    if (start_epoch <= 0 || end_epoch <= 0 || end_epoch <= start_epoch) {
      printf("Invalid time window: %s → %s\n", start_iso, end_iso) > "/dev/stderr"
      exit 3
    }
  }
  types["Search"]; types["Facet"]; types["Related List"]; types["Search Will Match"];
  types["Search Estimate"]; types["Document"]; types["Translate"]; types["Other"];
}

# --- Robust parse per line ---
{
  raw = $0
  sub(/\r$/, "", raw)  # CRLF-safe

  # Timestamp between [ ... ]
  if (!match(raw, /\[[0-9]{2}\/[A-Za-z]{3}\/[0-9]{4}:[0-9]{2}:[0-9]{2}:[0-9]{2} [+-][0-9]{4}\]/, ts)) {
    if (debug) print "NO_TS:", raw
    next
  }
  tstamp = substr(ts[0], 2, length(ts[0])-2)

  # Method + URI inside quotes
  if (!match(raw, /"([A-Z]+) ([^"]+) HTTP\/[0-9.]+"/, rq)) {
    if (debug) print "NO_REQ:", raw
    next
  }
  method = rq[1]
  uri    = rq[2]

  # Status + bytes at end (allow flexible spaces)
  if (!match(raw, / ([0-9]{3}) ([0-9]+|-)\s+-\s+-\s*$/, sb)) {
    if (debug) print "NO_SB:", raw
    next
  }
  status = sb[1]
  bytes  = (sb[2] == "-" ? 0 : sb[2]) + 0

  epoch = logts_to_epoch(tstamp)
  if (use_time_filter && (epoch < start_epoch || epoch >= end_epoch)) next

  type = classify(uri)

  count[type]++
  bytes_sum[type] += bytes
  status_count[status]++
  total++
  bytes_total += bytes

  # File-level info (helpful in DEBUG)
  file_total[FILENAME]++
  if (!(FILENAME in file_first_ts)) file_first_ts[FILENAME] = tstamp
  file_last_ts[FILENAME] = tstamp
}

END{
  if (use_time_filter) {
    printf("Window (UTC): %s → %s\n", start_iso, end_iso)
  } else {
    printf("Processing all log entries (no time filter)\n")
  }

  if (debug) {
    print "\nFile-level matches:"
    for (f in file_total) {
      printf("  %-50s  matches=%d  first=%s  last=%s\n", f, file_total[f], file_first_ts[f], file_last_ts[f])
    }
  }

  printf("\nTotals:\n")
  printf("  Requests: %d\n", total)
  printf("  Bytes:    %d\n", bytes_total)

  printf("\nBy type (count, bytes):\n")
  for (t in types) printf("  %-18s %10d %15d\n", t, count[t]+0, bytes_sum[t]+0)

  s = (count["Search"]+0) ? count["Search"] : 1
  printf("\nFacet per Search ratio: %.2f\n", (count["Facet"]+0)/s)

  printf("\nStatus codes:\n")
  for (sc in status_count) printf("  %-4s %10d\n", sc, status_count[sc])
}
' $FILES
