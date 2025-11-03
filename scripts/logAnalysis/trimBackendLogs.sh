#!/bin/bash

# This script is based on the collectLogs.sh script. It could potentially be incorporated as a second step of that script.
# Currently this supports the access and error logs, but could be extended for others.

# Bits that go into the input filenames, which is a carryover from collectLogs.sh.  We could modify this script to get 
# all files that match each input basename --or, as noted above, collect and trim in the same script.
declare -a inputBasenames=("ErrorLog" "8003_ErrorLog" "8003_AccessLog" "8003_RequestLog" "8006_ErrorLog" "8006_AccessLog" "8006_RequestLog")
declare -a ipAddresses=("10.5.156.95")
testDate=20251030
envName=mini-ml

# Number of days since logs were rotated out (e.g., 1 for yesterday, 2 for day before, etc.)
# Set to empty string or 0 for current logs (no suffix)
daysBack=1

# Omit trailing slash.
inputDir=.

# Specify the range to trim to in pieces to facilitate multiple timestamp patterns.
# All provided times need to be on the same date.
YYYY=2025
mmm=Oct
MM=10
DD=30

# Specify multiple start and end time pairs
declare -a startTimes=("22:43:00" "22:52:00" "23:04:00" "23:14:00" "23:24:00" "23:35:00")
declare -a endTimes=("22:50:00" "23:01:00" "23:11:00" "23:22:00" "23:33:00" "23:45:00")

#
# Process each time pair
#
startTimesCnt=${#startTimes[@]}
for (( timePair=0; timePair<${startTimesCnt}; timePair++ )); do
  startTime=${startTimes[$timePair]}
  endTime=${endTimes[$timePair]}
  
  # Create output directory based on time pair (remove colons for directory name)
  outputDirSuffix=$(echo "${startTime}-${endTime}" | tr -d ':')
  outputDir="./${outputDirSuffix}"
  
  # Access log:  "DD/mmm/YYYY:HH:mm:ss"
  accessLogStartTime="${DD}/${mmm}/${YYYY}:${startTime}"
  accessLogEndTime="${DD}/${mmm}/${YYYY}:${endTime}"
  # Error log:   "YYYY-MM-DD HH:mm:ss.SSS"
  errorLogStartTime="${YYYY}-${MM}-${DD} ${startTime}.000"
  errorLogEndTime="${YYYY}-${MM}-${DD} ${endTime}.000"
  # Request log: "YYYY-MM-DDTHH:mm:ss"
  requestLogStartTime="${YYYY}-${MM}-${DD}T${startTime}"
  requestLogEndTime="${YYYY}-${MM}-${DD}T${endTime}"

  [[ -d "$outputDir" ]] || mkdir "$outputDir"

  #
  # Execute commands on each node.
  #
  ipAddressCnt=${#ipAddresses[@]}
  inputBasenamesCnt=${#inputBasenames[@]}
  for (( s=0; s<${ipAddressCnt}; s++ )); do
    ipAddress=${ipAddresses[$s]}

    # Iterate through the filenames
    for (( t=0; t<${inputBasenamesCnt}; t++ )); do
      # Underscores in the output filenames were problematic; switched to hyphens.
      # Add dash prefix for rotated logs (when daysBack > 0)
      if [[ -n "$daysBack" && "$daysBack" -gt 0 ]]; then
        inputBasename=${inputBasenames[$t]}-${daysBack}
      else
        inputBasename=${inputBasenames[$t]}
      fi
      outputBasename=$(echo "$inputBasename" | tr _ -)

      # Last digits of IP address used in the output filename.  There is a potential chance of conflict.
      ipAddressEnd=${ipAddress##*.}

      fileIn="$inputDir/$testDate-$envName-node-$ipAddressEnd-$outputBasename.txt"
      fileOut="$outputDir/$testDate-$envName-node-$ipAddressEnd-$outputBasename-trimmed.txt"
      zipOut="$outputDir/$testDate-$envName-node-$ipAddressEnd-$outputBasename-trimmed.zip"

      # Determine pattern of timestamps we are to use
      if [[ $inputBasename == *"AccessLog"* ]]; then
        #
        # Given sample access log entry...
        #
        # 10.5.156.211 - lux_consumer_prod [15/May/2023:17:23:22 +0000] "POST /ds/lux/item.mjs HTTP/1.1" 200 44230 - -
        #
        # ...set the field separator to open bracket and compare the dates against the 2nd field, which is where the day starts.
        #
        awk -v "FS=[" -v "start=$accessLogStartTime" -v "end=$accessLogEndTime" '/./ { inrange = $2 >= start && $2 <= end } inrange' < "$fileIn" > "$fileOut"
      elif [[ $inputBasename == *"ErrorLog"* ]]; then
        #
        # Given sample error log entries...
        #
        # 2023-05-15 13:11:38.515 Info: [Event:id=LuxNamedProfiles] Applied the 'name' profile to 'https://lux.collections.yale.edu/data/concept/04736858-0d8e-4da4-8e92-d65e479c6eeb' in 3 milliseconds.
        # 2023-05-15 01:06:00.407 Info: Memory 22% phys=255137 size=64847(25%) rss=11809(4%) huge=44734(17%) anon=6813(2%) file=12822(5%) forest=16750(6%) cache=43357(16%) registry=2(0%)
        #
        # ...set the field separator to a regular expression for the milliseconds and compare the dates against the 1st field, which
        # will be the year through minutes.
        #
        awk -v "FS=[.][0-9]{3} " -v "start=${errorLogStartTime}" -v "end=${errorLogEndTime}" '/./ { inrange = $1 >= start && $1 <= end } inrange' < "$fileIn" > "$fileOut"
      else
        #
        # Given sample request log entry...
        #
        # {"time":"2023-06-15T15:32:54Z", "url":"/ds/lux/searchWillMatch.mjs", "user":"lux_consumer_prod", "elapsedTime":0.20666, "requests":1, "listCacheHits":523, "tripleCacheHits":1918, "tripleValueCacheHits":12, "expandedTreeCacheHits":3, "filterHits":3, "dbProgramCacheHits":1, "dbProgramCacheMisses":4, "dbMainModuleSequenceCacheMisses":1, "fsLibraryModuleCacheHits":29, "fsLibraryModuleCacheMisses":9, "dbLibraryModuleCacheHits":55, "dbLibraryModuleCacheMisses":29, "compileTime":0.000542, "runTime":0.155223, "hosts":[{"hostName":"10.5.254.46", "roundTripCount":12, "roundTripTime":"PT0.155291S"}, {"hostName":"10.5.156.227", "roundTripCount":12, "roundTripTime":"PT0.155294S"}]}
        #
        # ...set the field separator to the double quotation mark and compare the dates against the 4th field, which will be the entire timestamp.
        #
        awk -v 'FS="' -v "start=${requestLogStartTime}" -v "end=${requestLogEndTime}" '/./ { inrange = $4 >= start && $4 <= end } inrange' < "$fileIn" > "$fileOut"
      fi
    
      lineCnt=$(wc -l "$fileOut" | sed -e 's/ .*//g')
      echo "Wrote $lineCnt lines into $fileOut"

      # Desired to attach files to tickets.  Must be 25 MB or less.
      # Git Bash help: https://stackoverflow.com/questions/38782928/how-to-add-man-and-zip-to-git-bash-installation-on-windows#answer-55749636
      # zip "$zipOut" "$fileOut"
    done
  done

  # Run mining script on this time pair's output directory
  echo "Running mining script on $outputDir..."
  if [[ -f "./mineBackendLogs.sh" ]]; then
    ./mineBackendLogs.sh "$outputDir"
  else
    echo "Warning: mineBackendLogs.sh not found in current directory"
  fi
done

echo ""
echo "Done"