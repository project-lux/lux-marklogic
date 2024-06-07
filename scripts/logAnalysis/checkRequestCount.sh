#!/bin/bash
#
# The script serves as an additional check to see if a performance test is off to a good start.
# 
# It requires /tmp/trimLocalRequestLogs.sh with execute permission on each ML node.  After running
# that script, it downloads the trimmed request log files and tallies the request count.
#
# Before using, please update variables within the "Configuration" section.
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

# PEM file to access the source environment.
pemFile="PATH/TO/YOUR/FILE.pem"

# All IP addresses of the target ML cluster.
declare -a ipAddresses=("${INSERT}" "${IP_ADDRESSES}" "${HERE}")

# Local directory to write the trimmed logs within.  Omit trailing slash.
downloadDir="./early-check-$1"

#
# END: Configuration
#

[[ -d "$downloadDir" ]] || mkdir "$downloadDir"

#
# Execute commands on each node.
#
echo ""
echo "Trimming logs remotely then downloading..."
echo ""
ipAddressCnt=${#ipAddresses[@]}
for (( s=0; s<${ipAddressCnt}; s++ )); do
  ipAddress=${ipAddresses[$s]}

  cmd="ssh -i '$pemFile' ec2-user@$ipAddress \"/tmp/trimLocalRequestLogs.sh $1\""
  echo "Executing: $cmd"
  eval $cmd

  cmd="scp -i '$pemFile' 'ec2-user@$ipAddress:/tmp/*RequestLog-trimmed.txt' '$downloadDir'"
  echo "Executing: $cmd"
  eval $cmd
done

echo ""
echo "Done trimming and downloading logs."
echo ""

echo "Request counts:"
echo ""
wc -l $downloadDir/*RequestLog*
