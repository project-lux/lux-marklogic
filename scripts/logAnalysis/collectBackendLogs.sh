#!/bin/bash

#
# Configuration
#
declare -a ipAddresses=("${INSERT}" "${IP_ADDRESSES}" "${HERE}")
# PEM file to access the source environment.
pemFile=~/Apps/LUX/ML/ch-lux-ssh-prod.pem
# Basenames of all files to pull down.  Omit the portion covered by inputBasenameSuffix.  Also incorporated into the output filenames.
declare -a inputBasenames=("ErrorLog" "8003_ErrorLog" "8003_AccessLog" "8003_RequestLog" "8004_ErrorLog" "8004_AccessLog" "8004_RequestLog")
# The suffix to add to the inputBasenames.  Use an empty string for today, _1 for yesterday, etc.
inputBasenameSuffix=
# Output directory.  Omit trailing slash.
outputDir=~/Apps/LUX/ML/test/20240521
# Date of test formatted as YYYYMMDD.  Used in the output filename.
testDate=20240521
sarDate=2024-05-21
# A reference to the source environment.  Used in the output filename.
envName=blue-as-test

# Make the output directory when it doesn't already exist.
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
    inputBasename=${inputBasenames[$t]}
    outputBasename=$(echo "$inputBasename" | tr _ -)

    # Last digits of IP address used in the output filename.  There is a potential chance of conflict.
    ipAddressEnd=${ipAddress##*.}
    
    cmd="scp -i '$pemFile' 'ec2-user@$ipAddress:/var/opt/MarkLogic/Logs/$inputBasename$inputBasenameSuffix.txt' '$outputDir/$testDate-$envName-node-$ipAddressEnd-$outputBasename.txt'"
    echo "Executing: $cmd"
    eval $cmd
  done

  # copy sar files
   scmd="scp -i '$pemFile' ec2-user@$ipAddress:/tmp/sar*${sarDate}*gz '$outputDir/'"
    echo "Executing: $scmd"
    eval $scmd
done

echo ""
echo "Done"
