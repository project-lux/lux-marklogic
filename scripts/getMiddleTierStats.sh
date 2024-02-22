#!/bin/bash

# Script intended to run while the system is under load.
# Stop the script when you're done.

env=tst
endPoint="https://lux-front-$env.collections.yale.edu/api/_info"

today=$(date +%Y%m%d)
outputFile=./$today-$env-middle-tier-stats.txt

sleepInSeconds=2

while true
  date >> "$outputFile"
  do curl "$endPoint" >> "$outputFile"
  echo "" >> "$outputFile"
  echo "" >> "$outputFile"
  sleep $sleepInSeconds
done
