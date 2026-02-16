#!/bin/bash

# This script is based on the collectLogs.sh script. It could potentially be incorporated as a second step of that script.
# Currently this supports the access and error logs, but could be extended for others.

#
# CONFIGURATION: START
#

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
MM=10
DD=30

# Identify the time ranges to extract.
#
# Option 1: Automatic range detection (set AUTO_DETECT_RANGES=true)
AUTO_DETECT_RANGES=true
AUTO_DETECT_START_TIME="22:43:00"  # Earliest time to consider for auto-detection (HH:MM:SS)
AUTO_DETECT_END_TIME="23:45:00"    # Latest time to consider for auto-detection (HH:MM:SS)
GAP_THRESHOLD_MINUTES=1            # Minimum gap in minutes to consider a new range
MIN_RANGE_DURATION_MINUTES=3       # Minimum duration for a range to be included

# Option 2: Manual configuration (set AUTO_DETECT_RANGES=false)
declare -a startTimes=("22:43:00" "22:52:00" "23:04:00" "23:14:00" "23:24:00" "23:35:00")
declare -a endTimes=("22:50:00" "23:01:00" "23:11:00" "23:22:00" "23:33:00" "23:45:00")

PREVIEW_RANGES=true  # Set to true to preview detected or configured ranges without processing

#
# CONFIGURATION: END
#

# Convert numeric month to abbreviated month name for access log format
case $MM in
  01) mmm="Jan" ;;
  02) mmm="Feb" ;;
  03) mmm="Mar" ;;
  04) mmm="Apr" ;;
  05) mmm="May" ;;
  06) mmm="Jun" ;;
  07) mmm="Jul" ;;
  08) mmm="Aug" ;;
  09) mmm="Sep" ;;
  10) mmm="Oct" ;;
  11) mmm="Nov" ;;
  12) mmm="Dec" ;;
  *) echo "Invalid month: $MM"; exit 1 ;;
esac

# Function to auto-detect time ranges from access log files
detect_time_ranges() {
  local logFile=""
  
  # Find an access log file to analyze (prefer 8003 but fall back to 8006)
  for pattern in "8003-AccessLog" "8006-AccessLog"; do
    local ipAddressEnd=${ipAddresses[0]##*.}
    # Look for any file in inputDir that contains the pattern
    for file in "$inputDir"/*"$pattern"*.txt; do
      if [[ -f "$file" ]]; then
        logFile="$file"
        break 2  # Break out of both loops
    fi
    done
  done
  
  if [[ -z "$logFile" ]]; then
    echo "Warning: No access log file found for auto-detection. Using manual configuration."
    return 1
  fi
  
  echo "Analyzing $logFile for time ranges..."
  echo "Time boundaries: $AUTO_DETECT_START_TIME to $AUTO_DETECT_END_TIME"
  
  # Convert boundary times to seconds for filtering
  local startBoundarySeconds=$(echo "$AUTO_DETECT_START_TIME" | awk -F: '{print $1*3600 + $2*60 + $3}')
  local endBoundarySeconds=$(echo "$AUTO_DETECT_END_TIME" | awk -F: '{print $1*3600 + $2*60 + $3}')
  
  # Handle day boundary crossing (if end time < start time, end is next day)
  if [[ $endBoundarySeconds -lt $startBoundarySeconds ]]; then
    endBoundarySeconds=$((endBoundarySeconds + 86400))
  fi
  
  # Extract timestamps and detect gaps
  # Access log format: [DD/mmm/YYYY:HH:MM:SS +0000]
  # We'll extract HH:MM:SS and convert to seconds for gap analysis
  local tempFile=$(mktemp 2>/dev/null || echo "/tmp/trim_logs_$$_$RANDOM")
  
  # Extract timestamps, convert to seconds, filter by boundaries, and sort
  awk -F'[\\[\\]]' -v startBound="$startBoundarySeconds" -v endBound="$endBoundarySeconds" '
    /\[.*:.*:.*:.*\]/ {
      # Extract timestamp part: DD/mmm/YYYY:HH:MM:SS
      split($2, parts, ":")
      if (length(parts) >= 4) {
        # parts[2] = HH, parts[3] = MM, parts[4] = SS (ignoring timezone)
        split(parts[4], secParts, " ")  # Remove timezone
        seconds = parts[2] * 3600 + parts[3] * 60 + secParts[1]
        
        # Apply boundary filtering
        timeInBounds = 0
        if (endBound > 86400) {
          # Handle day boundary crossing
          timeInBounds = (seconds >= startBound) || (seconds <= (endBound - 86400))
        } else {
          # Normal case - same day
          timeInBounds = (seconds >= startBound) && (seconds <= endBound)
        }
        
        if (timeInBounds) {
          print seconds, parts[2] ":" parts[3] ":" secParts[1]
        }
      }
    }' "$logFile" | sort -n > "$tempFile"
  
  if [[ ! -s "$tempFile" ]]; then
    echo "Warning: No valid timestamps found in $logFile. Using manual configuration."
    rm -f "$tempFile"
    return 1
  fi
  
  # Analyze gaps and create ranges
  local gapThresholdSeconds=$((GAP_THRESHOLD_MINUTES * 60))
  local minDurationSeconds=$((MIN_RANGE_DURATION_MINUTES * 60))
  
  # Arrays to store detected ranges
  local detectedStarts=()
  local detectedEnds=()
  local currentStart=""
  local currentStartSeconds=0
  local lastTimestamp=""
  local lastSeconds=0
  
  while read -r seconds timestamp; do
    if [[ -z "$currentStart" ]]; then
      # Start of first range
      currentStart="$timestamp"
      currentStartSeconds=$seconds
      lastTimestamp="$timestamp"
      lastSeconds=$seconds
    elif [[ $((seconds - lastSeconds)) -gt $gapThresholdSeconds ]]; then
      # Gap detected - end current range and start new one
      local duration=$((lastSeconds - currentStartSeconds))
      if [[ $duration -lt 0 ]]; then
        # Handle day boundary crossing (e.g., range spans midnight)
        duration=$((duration + 86400))
      fi
      
      if [[ $duration -ge $minDurationSeconds ]]; then
        detectedStarts+=("$currentStart")
        detectedEnds+=("$lastTimestamp")
      fi
      
      currentStart="$timestamp"
      currentStartSeconds=$seconds
    fi
    
    lastTimestamp="$timestamp"
    lastSeconds=$seconds
  done < "$tempFile"
  
  # Add final range if it meets minimum duration
  if [[ -n "$currentStart" ]]; then
    local duration=$((lastSeconds - currentStartSeconds))
    if [[ $duration -lt 0 ]]; then
      # Handle day boundary crossing
      duration=$((duration + 86400))
    fi
    
    if [[ $duration -ge $minDurationSeconds ]]; then
      detectedStarts+=("$currentStart")
      detectedEnds+=("$lastTimestamp")
    fi
  fi
  
  rm -f "$tempFile"
  
  # Update global arrays
  if [[ ${#detectedStarts[@]} -gt 0 ]]; then
    startTimes=("${detectedStarts[@]}")
    endTimes=("${detectedEnds[@]}")
    echo "Auto-detected ${#startTimes[@]} time ranges:"
    for ((i=0; i<${#startTimes[@]}; i++)); do
      echo "  Range $((i+1)): ${startTimes[$i]} - ${endTimes[$i]}"
    done
    return 0
  else
    echo "Warning: No suitable time ranges detected. Using manual configuration."
    return 1
  fi
}

# Auto-detect ranges if enabled
if [[ "$AUTO_DETECT_RANGES" == "true" ]]; then
  if ! detect_time_ranges; then
    echo "Falling back to manual configuration..."
  fi
fi

# Preview mode: Show ranges and exit without processing
if [[ "$PREVIEW_RANGES" == "true" ]]; then
  echo ""
  echo "=== PREVIEW MODE ==="
  if [[ "$AUTO_DETECT_RANGES" == "true" ]]; then
    echo "Auto-detection settings:"
    echo "  Time boundaries: $AUTO_DETECT_START_TIME to $AUTO_DETECT_END_TIME"
    echo "  Gap threshold: $GAP_THRESHOLD_MINUTES minutes"
    echo "  Min range duration: $MIN_RANGE_DURATION_MINUTES minutes"
    echo ""
  fi
  
  echo "Time ranges for date $YYYY-$(printf "%02d" $((10#$MM)))-$(printf "%02d" $((10#$DD))):"
  startTimesCnt=${#startTimes[@]}
  
  if [[ $startTimesCnt -eq 0 ]]; then
    echo "  No time ranges configured or detected!"
    exit 1
  fi
  
  for ((i=0; i<${startTimesCnt}; i++)); do
    outputDirSuffix=$(echo "${startTimes[$i]}-${endTimes[$i]}" | tr -d ':')
    echo "  Range $((i+1)): ${startTimes[$i]} - ${endTimes[$i]} → ./${outputDirSuffix}/"
  done
  
  echo ""
  echo "Optional post-processing scripts:"
  if [[ -f "./analyzeByRequestType.sh" ]]; then
    echo "  ✓ analyzeByRequestType.sh will run (found)"
  else
    echo "  ✗ analyzeByRequestType.sh will not run (not found)"
  fi
  
  if [[ -f "./mineBackendLogs.sh" ]]; then
    echo "  ✓ mineBackendLogs.sh will run (found)"
  else
    echo "  ✗ mineBackendLogs.sh will not run (not found)"
  fi
  
  echo ""
  echo "Preview complete. Set PREVIEW_RANGES=false to execute trimming."
  exit 0
fi

#
# Process each time pair
#
startTimesCnt=${#startTimes[@]}
for (( timePair=0; timePair<${startTimesCnt}; timePair++ )); do
  startTime=${startTimes[$timePair]}
  endTime=${endTimes[$timePair]}
  timeSuffix=$(echo "${startTime}-${endTime}" | tr -d ':')
  outputFilenamePrefix="$testDate-$timeSuffix-$envName"
  
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
      fileOut="$outputDir/$outputFilenamePrefix-node-$ipAddressEnd-$outputBasename.txt"
      zipOut="$outputDir/$outputFilenamePrefix-node-$ipAddressEnd-$outputBasename.zip"

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

  # Run request type analysis script on this time pair's trimmed access logs
  echo "Running request type analysis on $outputDir..."
  if [[ -f "./analyzeByRequestType.sh" ]]; then
    # Change to output directory and run analysis on trimmed access logs
    (cd "$outputDir" && ../analyzeByRequestType.sh "*AccessLog*.txt" > "$outputFilenamePrefix-requestTypeAnalysis.txt" 2>&1)
    echo "Request type analysis saved to $outputDir/$outputFilenamePrefix-requestTypeAnalysis.txt"
  else
    echo "Warning: analyzeByRequestType.sh not found in current directory"
  fi

  # Run mining script on this time pair's output directory
  echo "Running mining script on $outputDir..."
  if [[ -f "./mineBackendLogs.sh" ]]; then
    # Format date as YYYY-MM-DD and pass env name, directory, date, start time, end time as parameters
    formattedDate=$(printf "%04d-%02d-%02d" $YYYY $((10#$MM)) $((10#$DD)))
    ./mineBackendLogs.sh "$envName" "$outputDir" "$formattedDate" "$startTime" "$endTime"
  else
    echo "Warning: mineBackendLogs.sh not found in current directory"
  fi

done

echo ""
if [[ "$AUTO_DETECT_RANGES" == "true" ]]; then
  echo "Completed processing $startTimesCnt auto-detected time ranges for date $YYYY-$(printf "%02d" $((10#$MM)))-$(printf "%02d" $((10#$DD)))"
else
  echo "Completed processing $startTimesCnt manually configured time ranges for date $YYYY-$(printf "%02d" $((10#$MM)))-$(printf "%02d" $((10#$DD)))"
fi
echo "Created directories:"
for ((i=0; i<${startTimesCnt}; i++)); do 
  echo -e "\t./${startTimes[$i]//:/}-${endTimes[$i]//:/}"
done
echo "Done"