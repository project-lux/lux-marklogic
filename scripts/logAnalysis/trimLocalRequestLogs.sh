#!/bin/bash
#
# This script is to be deployed as /tmp/trimLocalRequestLogs.sh with execute permission
# on each ML node.  It is called by checkRequestCount.sh and is expected to write trimmed
# request logs out as /tmp/*RequestLog-trimmed.txt. See checkRequestCount.sh for additional
# details.
#
# The script requires a single parameter: the number of minutes to trim the logs to.
#

die () {
    script=`basename "$0"`
    echo >&2 ""
    echo >&2 "$@"
    echo >&2 ""
    echo >&2 "Usage: $script [minutes]"
    echo >&2 ""
    echo >&2 "Example: $script 10"
    echo >&2 ""
    exit 1
}

[ "$#" -eq 1 ] || die "Exactly one parameter is required: the number of minutes to check."

#
# START: Configuration
#
# Local ports of interest.
declare -a ports=("8003" "8004")
logDir=/var/opt/MarkLogic/Logs
trimDir=/tmp
#
# END: Configuration
#

# Determine the range to trim the logs to.
startTime=$(date -u --date "-$1 min" '+%Y-%m-%dT%H:%M')
endTime=$(date -u '+%Y-%m-%dT%H:%M')

echo -e "Trimming logs from $startTime to $endTime UTC..."

# Interate through the filenames
hostname=$(hostname)
portsCnt=${#ports[@]}
for (( t=0; t<${portsCnt}; t++ )); do
  # Underscores in the output filenames were problematic; switched to hyphens.
  inputBasename="${ports[$t]}_RequestLog"
  outputBasename=$(echo "$hostname-$inputBasename-trimmed" | tr _ -)

  fileIn="$logDir/$inputBasename.txt"
  fileOut="/tmp/$outputBasename.txt"

  awk -v 'FS="' -v "start=${startTime}" -v "end=${endTime}" '/./ { inrange = $4 >= start && $4 <= end } inrange' < "$fileIn" > "$fileOut"
  
  lineCnt=$(wc -l "$fileOut" | sed -e 's/ .*//g')
  echo "Wrote $lineCnt lines into $fileOut"
done
