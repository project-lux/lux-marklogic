#
# Step 2 of 2: Create a report of searches that have higher estimates (unfiltered results)
#   than actual counts (filtered results).
#
# Prerequisites and directions: See step-01-mineSearchCriteria.
#
#!/bin/bash

DIFFERENCES_FILE=./differences.tsv
echo -e "Estimate\tCount\tCriteria" > "$DIFFERENCES_FILE"

requestCount=0
matchCount=0
noMatchCount=0

# Connection settings
protocol=https
host=OMITTED
port=8004
username=lux_consumer_dev
password=OMITTED

searchEstimateUrl="$protocol://$host:$port/ds/lux/searchEstimate.mjs"
searchUrl="$protocol://$host:$port/ds/lux/search.mjs"

# Read input file, one line at a time
IFS=";"
while read line; do
  ((requestCount++))

  read -ra splitLine <<< "$line"

  scope="${splitLine[0]}"
  q="${splitLine[1]}"

  # Get estimate
  # TODO: Gracefully handle requests that time out.
  estimate=$(curl --digest --insecure \
    -u "$username":"$password" \
    -F "scope=${scope}" \
    -F "q=${q}" \
    "$searchEstimateUrl" \
    | jq ".totalItems")
  echo -e "Estimate: $estimate"

  # Calculate last page
  pageLength=20
  mod=$(($estimate % $pageLength))
  whole=$(($estimate / $pageLength))
  if [ $mod -gt 0 ]; then
    page=$(($whole + 1))
  else
    page=$whole
  fi

  # Get last page, filtered
  # TODO: Gracefully handle requests that time out.
  pageCount=$(curl --digest --insecure \
    -u "$username":"$password" \
    "$searchUrl" \
    -F "filterResults=true" \
    -F "scope=${scope}" \
    -F "q=${q}" \
    -F "page=${page}" \
    -F "pageLength=${pageLength}" \
    | jq ".orderedItems | length")
  echo -e "Page count: $pageCount"

  # Determine actual count.
  actual=$(((($page - 1) * $pageLength) + $pageCount))
  echo -e "Actual: $actual"

  if [ $estimate -eq $actual ]; then
    echo "Matched!"
    ((matchCount++))
  else
    echo "Oh no!"
    ((noMatchCount++))
    echo -e "$estimate\t$actual\t$q" >> "$DIFFERENCES_FILE"
  fi
done < ./searchParamsAndDurations.jsonl

echo -e "Total no. of requests: $requestCount"
echo -e "Count matched estimate: $matchCount"
echo -e "Count did not match estimate: $noMatchCount"
echo -e "See $DIFFERENCES_FILE"
