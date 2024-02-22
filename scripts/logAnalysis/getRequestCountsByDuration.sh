#!/bin/bash

#
# One of the first scripts that look at the request logs.  As originally committed, it will emit the number
# of requests that took one to 99 seconds (for each second), one line for requests that took >= 100 seconds,
# and finally the total number of requests for double-checking purposes.  
#
# The output can be pasted into a spreadsheet, labeled, then charted.
#
# This script could be rolled into mineBackendLogs.sh.  trimBackendLogs.sh was already extended to trim the request logs.
#
# For a reason not yet investigated, this script can report more requests of the same request types than mineBackendLogs's
# allRequestsWithDurations.tsv and thus could be better or worse, depending on the reason.
#
# To filter by request, set filterPattern to something unique to the request, such as "item" for document
# requests.  Be wary of using "search" as the middle tier may still be using that endpoint for both search
# and facet requests.
#
filterPattern=item
filePattern=*RequestLog*

function getCount() {
  grep "\elapsedTime\":$1" $filePattern | grep "$filterPattern" | grep -c elapsed
}

echo "---"
echo ""
echo -E "Number of requests by duration filtered by '$filterPattern'"
echo ""

for (( i=0; i<100; i++ )); do
  getCount "$i[.]"
done

echo "Requests that took >= 100 seconds:"
getCount "[1-9][0-9][0-9][.]"

echo "Total number of filtered requests"
getCount ""

echo ""
echo "Done"
