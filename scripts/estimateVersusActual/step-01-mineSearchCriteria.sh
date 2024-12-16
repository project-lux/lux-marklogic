#
# Step 1 of 2: Create the input for the companion script, step-02-createSearchReport.sh
#
# Prerequisite: The jq command, which is used to extract values from JSON.
#   See https://jqlang.github.io/jq/
#
# Directions:
#   1. Create an empty directory.
#   2. Copy this and its companion script therein.
#   3. Use the likes of collectBackendLogs.sh to add logs herein.
#      Only those containing the search entries are needed.
#   4. Make sure APP_ERROR_LOG_PATTERN matches.
#   5. Run this script (no params).
#   6. If deemed necessary and the companion script still doesn't 
#      gracefully handle time outs, temporarily increase the amount
#      of time given to searchEstimate and search requests.
#   7. Configure the "Connection settings" section in step-02-createSearchReport.sh.
#   8. Run step-02-createSearchReport.sh.
#      Could take awhile.  May want to run in the background (nohup).
#   9. Check out ./differences.csv!
#  10. Restore any temporary timeout setting changes.
#

# Script configuration
OUTPUT_DIRECTORY=.
APP_ERROR_LOG_PATTERN=*8004-ErrorLog*.txt

SEARCH_PARAMS_WITH_DURATIONS_FILE=$OUTPUT_DIRECTORY/searchParamsAndDurations.txt
SEARCH_PARAMS_WITH_DURATIONS_JSON_FILE=$OUTPUT_DIRECTORY/searchParamsAndDurations.jsonl

[[ -d "$OUTPUT_DIRECTORY" ]] || mkdir "$OUTPUT_DIRECTORY"

# All completed search requests w/ durations.
echo -e "   $SEARCH_PARAMS_WITH_DURATIONS_FILE..."
grep "searchElapsed" $APP_ERROR_LOG_PATTERN > $SEARCH_PARAMS_WITH_DURATIONS_FILE

# Convert the search params info into JSON
echo -e "   $SEARCH_PARAMS_WITH_DURATIONS_JSON_FILE..."
perl -pe 's/^.*txt:(.*) Info: .* requestId: ([^;]+); requestContext: ([^;]+); filterResults: ([^;]+); totalElapsed: ([0-9]+); searchElapsed: ([0-9]+); estimate: ([0-9]+); returned: ([0-9]+); scope: \[([^\]]+)\]; searchCriteria: \[(.*)\]$/$9;$10/' \
  "$SEARCH_PARAMS_WITH_DURATIONS_FILE" \
  > "$SEARCH_PARAMS_WITH_DURATIONS_JSON_FILE"

echo -e ""
echo -e "Done"
