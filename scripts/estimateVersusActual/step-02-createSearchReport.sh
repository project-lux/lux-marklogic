#
# Step 2 of 2: Create a report of searches that have higher estimates (unfiltered results)
#   than actual counts (filtered results).
#
# Prerequisites and directions: See step-01-mineSearchCriteria.
#
#!/bin/bash

# Connection settings
protocol=https
host=OMITTED
port=8004
username=lux_consumer_dev
password=OMITTED

ZEROS_FILE=./zeros.tsv
echo -e "Scope\tCriteria" > "$ZEROS_FILE"

ERRORS_FILE=./errors.tsv
echo -e "Estimate\tScope\tCriteria" > "$ERRORS_FILE"

DIFFERENCES_FILE=./differences.tsv
echo -e "Difference\tEstimate\tCount\tScope\tCriteria" > "$DIFFERENCES_FILE"

zeroEstimateCount=0
errorCount=0
matchCount=0
noMatchCount=0
requestCount=0

searchEstimateUrl="$protocol://$host:$port/ds/lux/searchEstimate.mjs"
searchUrl="$protocol://$host:$port/ds/lux/search.mjs"

# Read input file, one line at a time
isNumberRegEx='^[0-9]+$'
IFS=";"
while read line; do
  ((requestCount++))

  read -ra splitLine <<< "$line"

  scope="${splitLine[0]}"
  q="${splitLine[1]}"

  echo -e "scope: $scope"

  # Get estimate
  # TODO: Gracefully handle requests that time out.
  estimate=$(curl --digest --insecure \
    -u "$username":"$password" \
    -F "scope=${scope}" \
    -F "q=${q}" \
    "$searchEstimateUrl" \
    | jq ".totalItems")
  echo -e "Estimate: $estimate"

  # Estimates cannot include false negatives; thus, if the estimate is zero,
  # we can presume the actual is zero as well.
  if [ "$estimate" = "0" ]; then
    echo -e "$scope\t$q" >> "$ZEROS_FILE"
    ((zeroEstimateCount++))
    continue
  fi

  # When estimate is not a number, something went wrong locally or remotely.
  if ! [[ $estimate =~ $isNumberRegEx ]] ; then
    echo -e "$estimate\t$scope\t$q" >> "$ERRORS_FILE"
    ((errorCount++))
    continue
  fi

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
    diff=$(($estimate - $actual))
    echo -e "$diff\t$estimate\t$actual\t$scope\t$q" >> "$DIFFERENCES_FILE"
  fi
done < ./searchParamsAndDurations.jsonl

echo -e "$zeroEstimateCount: requests with an estimate of zero; see $ZEROS_FILE"
echo -e "$errorCount: requests that errored out; see $ERRORS_FILE"
echo -e "$noMatchCount: requests whose estimate did not match the actual; see $DIFFERENCES_FILE"
echo -e "$matchCount: requests whose estimate matched the actual count."
echo -e "$requestCount: total number of requests."
echo ""
echo -e "See $ZEROS_FILE, $ERRORS_FILE, and $DIFFERENCES_FILE"
