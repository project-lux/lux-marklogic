#!/bin/bash
#
# The script may be used to check each ErrorLog.txt within a cluster.  Multiple modes are offered.
# It was initially created to check the logs multiple times during a performance test.
# 
# Before using, please update variables within the "Configuration" section.
#
# The script requires a single parameter: the mode to run in.  The "restarts" mode greps for 
# MarkLogic restarting.  The "warnAndAbove" greps for all entries but omits debug and info-level
# entries (If the log level is set to lower than debug, those entries would be included.)
#
# To retain the output, send stdout to a file.
#

die () {
    script=`basename "$0"`
    echo >&2 ""
    echo >&2 "$@"
    echo >&2 ""
    echo >&2 "Usage: $script [restarts|warnAndAbove]"
    echo >&2 ""
    echo >&2 "Example: $script 10"
    echo >&2 ""
    exit 1
}

[ "$#" -eq 1 ] || die "Exactly one parameter is required: the mode to run in."

#
# START: Configuration
#

# PEM file to access the source environment.
pemFile="PATH/TO/YOUR/FILE.pem"

# All IP addresses of the target ML cluster.
declare -a ipAddresses=("${INSERT}" "${IP_ADDRESSES}" "${HERE}")

#
# END: Configuration
#

errorLog=/var/opt/MarkLogic/Logs/ErrorLog.txt
ipAddressCnt=${#ipAddresses[@]}
for (( s=0; s<${ipAddressCnt}; s++ )); do
  ipAddress=${ipAddresses[$s]}

  if [ "$1" = "restarts" ]
  then
    remoteCmd="grep 'Starting Mark' $errorLog"
  elif [ "$1" = "warnAndAbove" ]
  then
    remoteCmd="grep -v Debug $errorLog | grep -v Info"
  else
    die "Unknown mode: $1"
  fi

  msg="* $ipAddress follows *"
  # len=${#msg}
  # wrap=${printf "%*s" $len |tr " " "*"}
  wrap="*************************"
  echo ""
  echo -e "$wrap"
  echo -e "* Checking $ipAddress *"
  echo -e "$wrap"
  echo ""

  cmd="ssh -i '$pemFile' ec2-user@$ipAddress \"$remoteCmd\""
  echo "Executing: $cmd"
  eval $cmd
done
