#!/bin/bash

#
# Configuration
#
declare -a ipAddresses=("" "" "")
# PEM file to access the source environment.
pemFile=~/Apps/LUX/ML/ch-lux-ssh-prod.pem
# Basenames of all files to pull down.  Omit the portion covered by inputBasenameSuffix.  Also incorporated into the output filenames.
declare -a inputBasenames=("ErrorLog" "8003_ErrorLog" "8003_AccessLog" "8003_RequestLog" "8004_ErrorLog" "8004_AccessLog" "8004_RequestLog")

# Date or date range formatted as YYYYMMDD or YYYYMMDD-YYYYMMDD.  Used in the output filename.
dateRange=20250804-20250818
# Suffix associated to the *last* day in the date range
inputBasenameSuffix=7
# Output directory.  Omit trailing slash.
outputDir=./logs
# A reference to the source environment.  Used in the output filename.
envName=green-as-prod

# Make the output directory when it doesn't already exist.
[[ -d "$outputDir" ]] || mkdir "$outputDir"

#
# Parse date range and create arrays of dates and corresponding suffixes
#
if [[ "$dateRange" == *"-"* ]]; then
  # Date range provided
  IFS='-' read -ra DATE_PARTS <<< "$dateRange"
  startDate=${DATE_PARTS[0]}
  endDate=${DATE_PARTS[1]}
else
  # Single date provided
  startDate=$dateRange
  endDate=$dateRange
fi

# Function to increment date by one day
increment_date() {
  local date=$1
  date -d "${date:0:4}-${date:4:2}-${date:6:2} + 1 day" +%Y%m%d 2>/dev/null || \
  gdate -d "${date:0:4}-${date:4:2}-${date:6:2} + 1 day" +%Y%m%d
}

# Create arrays for dates and their corresponding suffixes
declare -a dates=()
declare -a suffixes=()

currentDate=$startDate
dateIndex=0

while [[ $currentDate -le $endDate ]]; do
  dates+=($currentDate)
  
  # Calculate suffix: most recent date gets inputBasenameSuffix, earlier dates get incremented values
  if [[ $currentDate == $endDate ]]; then
    suffixes+=($inputBasenameSuffix)
  else
    # Calculate how many days before the end date
    daysBefore=$((dateIndex))
    if [[ -n "$inputBasenameSuffix" ]]; then
      calculatedSuffix=$((inputBasenameSuffix + (${#dates[@]} - 1 - dateIndex)))
    else
      calculatedSuffix=$((${#dates[@]} - 1 - dateIndex))
    fi
    suffixes+=($calculatedSuffix)
  fi
  
  if [[ $currentDate == $endDate ]]; then
    break
  fi
  
  currentDate=$(increment_date $currentDate)
  ((dateIndex++))
done

# Recalculate suffixes properly - most recent date uses inputBasenameSuffix, earlier dates increment
declare -a correctedSuffixes=()
totalDates=${#dates[@]}

for (( i=0; i<${totalDates}; i++ )); do
  if [[ $i == $((totalDates - 1)) ]]; then
    # Last date (most recent) gets the original suffix
    correctedSuffixes+=($inputBasenameSuffix)
  else
    # Earlier dates get incremented suffix values
    if [[ -n "$inputBasenameSuffix" ]]; then
      correctedSuffix=$((inputBasenameSuffix + (totalDates - 1 - i)))
    else
      correctedSuffix=$((totalDates - 1 - i))
    fi
    correctedSuffixes+=($correctedSuffix)
  fi
done

#
# Execute commands on each node for each date
#
ipAddressCnt=${#ipAddresses[@]}
inputBasenamesCnt=${#inputBasenames[@]}
datesCnt=${#dates[@]}

for (( d=0; d<${datesCnt}; d++ )); do
  currentTestDate=${dates[$d]}
  currentSuffix=${correctedSuffixes[$d]}
  
  echo "Processing date: $currentTestDate with suffix: $currentSuffix"
  
  for (( s=0; s<${ipAddressCnt}; s++ )); do
    ipAddress=${ipAddresses[$s]}

    # Iterate through the filenames
    for (( t=0; t<${inputBasenamesCnt}; t++ )); do
      # Underscores in the output filenames were problematic; switched to hyphens.
      inputBasename=${inputBasenames[$t]}
      outputBasename=$(echo "$inputBasename" | tr _ -)

      # Last digits of IP address used in the output filename.  There is a potential chance of conflict.
      ipAddressEnd=${ipAddress##*.}
      
      # Add underscore prefix to suffix if it's not empty
      suffix=""
      if [[ -n "$currentSuffix" ]]; then
        suffix="_$currentSuffix"
      fi
      
      cmd="scp -i '$pemFile' 'ec2-user@$ipAddress:/var/opt/MarkLogic/Logs/$inputBasename$suffix.txt' '$outputDir/$currentTestDate-$envName-node-$ipAddressEnd-$inputBasename$suffix.txt'"
      echo "Executing: $cmd"
      eval $cmd
    done
  done
done

echo ""
echo "Done"
