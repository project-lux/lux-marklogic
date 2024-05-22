#!/bin/bash
#
# The script serves as an additional check to see if a performance test is off to a good start.
# It downloads and trims request logs to a specified number of minutes, then reports the total
# number of requests.  This count may be compared to previous runs, accounting for any material
# changes between runs.
#
# Before using, please update variables within the "Configuration" section.
#
# The script requires a single parameter: the number of minutes to trim the logs to.
#
# This script was created from pieces of collectBackendLogs.sh and trimBackendLogs.sh.  Given
# more time, the scripts could be DRY'd.
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

# A reference to the source environment.  Used in the output filename.
envName=blue-as-test

# PEM file to access the source environment.
pemFile=~/.ssh/yale/ch-lux-ssh-2bg.pem

# All IP addresses of the target ML cluster.
declare -a ipAddresses=("10.5.156.217" "10.5.157.111" "10.5.254.22")

# Just specify the base names of the request logs.
declare -a inputBasenames=("8003_RequestLog" "8004_RequestLog")

# The suffix to add to the inputBasenames.  Use an empty string for today, _1 for yesterday, etc.
inputBasenameSuffix=

# Local directory to download the logs into.  Omit trailing slash.
logDir=./early-check-untrimmed

# Local directory to write the trimmed logs within.  Omit trailing slash.
trimDir=./early-check-trimmed

# Specify the range to trim to in pieces to faciliate multiple timestamp patterns.
# Date of test formatted as YYYYMMDD.  Used in the output filename.
testDate=20240522

# Other parts of the date, broken down.
YYYY=2024
mmm=May
MM=05
DD=22

#
# END: Configuration
#

# Determine the range to trim the logs to --before taking the time to download the logs.
startTime=$(date -u --date "-$1 min" | grep -o "[0-9][0-9]:[0-9][0-9]:[0-9][0-9]")
endTime=$(date -u | grep -o "[0-9][0-9]:[0-9][0-9]:[0-9][0-9]")

# Ensure the local directories exist.
[[ -d "$logDir" ]] || mkdir "$logDir"
[[ -d "$trimDir" ]] || mkdir "$trimDir"

#
# Execute commands on each node.
#
echo ""
echo "Collecting logs..."
echo ""
ipAddressCnt=${#ipAddresses[@]}
inputBasenamesCnt=${#inputBasenames[@]}
for (( s=0; s<${ipAddressCnt}; s++ )); do
  ipAddress=${ipAddresses[$s]}

  # Interate through the filenames
  for (( t=0; t<${inputBasenamesCnt}; t++ )); do
    # Underscores in the output filenames were problematic; switched to hyphens.
    inputBasename=${inputBasenames[$t]}
    outputBasename=$(echo "$inputBasename" | tr _ -)

    # Last digits of IP address used in the output filename.  There is a potential chance of conflict.
    ipAddressEnd=${ipAddress##*.}
    
    cmd="scp -i '$pemFile' 'ec2-user@$ipAddress:/var/opt/MarkLogic/Logs/$inputBasename$inputBasenameSuffix.txt' '$logDir/$testDate-$envName-node-$ipAddressEnd-$outputBasename.txt'"
    echo "Executing: $cmd"
    eval $cmd
  done
done

echo ""
echo "Done collecting logs."
echo ""

echo -e "Trimming logs from $startTime to $endTime UTC..."
echo ""

# Request log: "YYYY-MM-DDTHH:mm:ss"
requestLogStartTime="${YYYY}-${MM}-${DD}T${startTime}"
requestLogEndTime="${YYYY}-${MM}-${DD}T${endTime}"

#
# Execute commands on each node.
#
ipAddressCnt=${#ipAddresses[@]}
inputBasenamesCnt=${#inputBasenames[@]}
for (( s=0; s<${ipAddressCnt}; s++ )); do
  ipAddress=${ipAddresses[$s]}

  # Interate through the filenames
  for (( t=0; t<${inputBasenamesCnt}; t++ )); do
    # Underscores in the output filenames were problematic; switched to hyphens.
    inputBasename=${inputBasenames[$t]}
    outputBasename=$(echo "$inputBasename" | tr _ -)

    # Last digits of IP address used in the output filename.  There is a potential chance of conflict.
    ipAddressEnd=${ipAddress##*.}

    fileIn="$logDir/$testDate-$envName-node-$ipAddressEnd-$outputBasename.txt"
    fileOut="$trimDir/$testDate-$envName-node-$ipAddressEnd-$outputBasename-trimmed.txt"

    #
    # Given sample request log entry...
    #
    # {"time":"2023-06-15T15:32:54Z", "url":"/ds/lux/searchWillMatch.mjs", "user":"lux_consumer_prod", "elapsedTime":0.20666, "requests":1, "listCacheHits":523, "tripleCacheHits":1918, "tripleValueCacheHits":12, "expandedTreeCacheHits":3, "filterHits":3, "dbProgramCacheHits":1, "dbProgramCacheMisses":4, "dbMainModuleSequenceCacheMisses":1, "fsLibraryModuleCacheHits":29, "fsLibraryModuleCacheMisses":9, "dbLibraryModuleCacheHits":55, "dbLibraryModuleCacheMisses":29, "compileTime":0.000542, "runTime":0.155223, "hosts":[{"hostName":"10.5.254.46", "roundTripCount":12, "roundTripTime":"PT0.155291S"}, {"hostName":"10.5.156.227", "roundTripCount":12, "roundTripTime":"PT0.155294S"}]}
    #
    # ...set the field separator to the double quotation mark and compare the dates against the 4th field, which will be the entire timestamp.
    #
    awk -v 'FS="' -v "start=${requestLogStartTime}" -v "end=${requestLogEndTime}" '/./ { inrange = $4 >= start && $4 <= end } inrange' < "$fileIn" > "$fileOut"
   
    lineCnt=$(wc -l "$fileOut" | sed -e 's/ .*//g')
    echo "Wrote $lineCnt lines into $fileOut"
  done
done

echo ""
echo "Done trimming logs."
echo ""

echo "Request counts:"
echo ""
wc -l $trimDir/*RequestLog*
