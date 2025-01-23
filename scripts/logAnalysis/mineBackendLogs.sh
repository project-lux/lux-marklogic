#
# Purpose:
#
#   Grep LUX backend logs for stats on most LUX endpoint requests, likely after QA runs their 
#   performance test but could also be used to see how an environment is being typically used.
#
#   Presently targets the 8003 and main error logs as well as 8003 access logs.  It could be 
#   extended to mine 8003 request logs (good stuff!).
#
#   Portions may not work as expected if the input logs are that of a single node because grep
#   only starts matching lines with the filename when multiple files are involved.  Multiple 
#   regular expressions expect lines to start with file names.
#
# Directions:
#
#   1. Create an empty directory.
#   2. Add a copy of this script in the same direction.
#   3. Retrieve the logs to grep, trimming each to the subject period.
#   4. Name files to align with the *_LOG_PATTERN_* variables.  
#
#      Suggested naming conventions:
#
#      Filename prefix: [date]_[env]_node_[uniquePartOfIpAddress]
#      Example: 20221017_test_node_226
#
#      App server logs: [prefix]_[port]_[type]Log.txt
#      Example: 20221017_test_node_226_8003_ErrorLog.txt
#
#      Main server logs: [prefix]_ErrorLog.txt
#      Example: 20221017_test_node_226_ErrorLog.txt
#
#   5. Review the remaining script configuration variables below, adjusting as necessary.
#   6. Run `sh ./mineBackendLogs.sh`
#   7. Review output.
#

# Script configuration
OUTPUT_DIRECTORY=./out
APP_ACCESS_LOG_PATTERN=*800[3-4]-AccessLog*.txt
APP_ERROR_LOG_PATTERN=*800[3-4]-ErrorLog*.txt

# Switched to egrep pattern as this one could omit some.
# ERROR_LOG_PATTERN_MAIN=*[^8][^0][^0-1][^3]-ErrorLog*.txt
ERROR_LOG_EGREP_PATTERN_MAIN=[^0-9]-[0-9]+-ErrorLog*.txt

ERROR_LOG_ABOVE_INFO_FILE=$OUTPUT_DIRECTORY/errorLogEntriesAboveInfo.txt
ALL_REQUESTS_METRICS_TSV_FILE=$OUTPUT_DIRECTORY/requestMetrics.tsv
ALL_REQUESTS_FILE=$OUTPUT_DIRECTORY/allRequestsWithDurations.txt
ALL_REQUESTS_TSV_FILE=$OUTPUT_DIRECTORY/allRequestsWithDurations.tsv
SEARCHES_LONG_RUNNING_FILE=$OUTPUT_DIRECTORY/searchLongRunning.txt
SEARCH_PARAMS_WITH_DURATIONS_FILE=$OUTPUT_DIRECTORY/searchParamsAndDurations.txt
SEARCH_PARAMS_WITH_DURATIONS_TSV_FILE=$OUTPUT_DIRECTORY/searchParamsAndDurations.tsv
SEARCH_PARAMS_WITH_DURATIONS_JSON_FILE=$OUTPUT_DIRECTORY/searchParamsAndDurations.json
FAILED_SEARCH_REQUESTS_FILE=$OUTPUT_DIRECTORY/failedSearchOnlyRequests.txt
FAILED_SEARCH_ESTIMATE_REQUESTS_FILE=$OUTPUT_DIRECTORY/failedSearchEstimateRequests.txt
FAILED_SEARCH_WILL_MATCH_REQUESTS_FILE=$OUTPUT_DIRECTORY/failedSearchWillMatchRequests.txt
FACET_REQUESTS_FILE=$OUTPUT_DIRECTORY/allFacetRequests.txt
FAILED_FACET_REQUESTS_FILE=$OUTPUT_DIRECTORY/allFailedFacetRequests.txt
AT_LEAST_ONE_RELATED_LIST_ITEM_FILE=$OUTPUT_DIRECTORY/atLeastOneRelatedListItem.txt
AT_LEAST_ONE_RELATED_LIST_ITEM_TSV_FILE=$OUTPUT_DIRECTORY/atLeastOneRelatedListItem.tsv
HIT_MAX_NUMBER_OF_RELATIONS=$OUTPUT_DIRECTORY/hitMaxNumberOfRelations.txt
FAILED_RELATED_LIST_REQUESTS=$OUTPUT_DIRECTORY/failedRelatedListRequests.txt
ODD_RELATED_LIST_ERRORS=$OUTPUT_DIRECTORY/oddRelatedListErrors.txt

# Constants
DURATION_IN_SECS_CELL=B6

# grepForLineCount [label] [regEx of all lines] [regEx of lines to count]
function grepForLineCount() {
  { echo -e "$1\t"; grep "$2" $APP_ERROR_LOG_PATTERN | grep -cE "$3"; } | sed ':a;N;s/\n//;ba' | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
}

# grepForSectionCounts [title] [regEx of all lines] [milliPrefix] [milliSuffix]
function grepForSectionCounts() {
  echo -e $1 | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
  grepForLineCount "0ms-9ms" "$2" "$3[0-9]$4"
  grepForLineCount "10ms-99ms" "$2" "$3[0-9][0-9]$4"
  grepForLineCount "100ms-999ms" "$2" "$3[0-9][0-9][0-9]$4"
  grepForLineCount "1s-2s" "$2" "$3[1][0-9][0-9][0-9]$4"
  grepForLineCount "2s-3s" "$2" "$3[2][0-9][0-9][0-9]$4"
  grepForLineCount "3s-4s" "$2" "$3[3][0-9][0-9][0-9]$4"
  grepForLineCount "4s-5s" "$2" "$3[4][0-9][0-9][0-9]$4"
  grepForLineCount "5s-6s" "$2" "$3[5][0-9][0-9][0-9]$4"
  grepForLineCount "6s-7s" "$2" "$3[6][0-9][0-9][0-9]$4"
  grepForLineCount "7s-8s" "$2" "$3[7][0-9][0-9][0-9]$4"
  grepForLineCount "8s-9s" "$2" "$3[8][0-9][0-9][0-9]$4"
  grepForLineCount "9s-10s" "$2" "$3[9][0-9][0-9][0-9]$4"
  grepForLineCount "10s-15s" "$2" "$3[1][0-4][0-9][0-9][0-9]$4"
  grepForLineCount "15s-20s" "$2" "$3[1][5-9][0-9][0-9][0-9]$4"
  grepForLineCount "20s-25s" "$2" "$3[2][0-4][0-9][0-9][0-9]$4"
  grepForLineCount "25s-30s" "$2" "$3[2][5-9][0-9][0-9][0-9]$4"
  grepForLineCount ">30s" "$2" "$3[3-9][0-9][0-9][0-9][0-9]$4"
  CURRENT_ROW=$(wc -l $ALL_REQUESTS_METRICS_TSV_FILE | sed -e 's/[^0-9]//g')
  END_SUM_ROW=$CURRENT_ROW
  START_SUM_ROW=$((END_SUM_ROW - 17 + 1))
  echo -e "Sub-Total\t=SUM(B$START_SUM_ROW:B$END_SUM_ROW)" >> $ALL_REQUESTS_METRICS_TSV_FILE
  CURRENT_ROW=$(wc -l $ALL_REQUESTS_METRICS_TSV_FILE | sed -e 's/[^0-9]//g')
  echo -e "Avg/sec\t=B$CURRENT_ROW/$DURATION_IN_SECS_CELL" >> $ALL_REQUESTS_METRICS_TSV_FILE
  echo -e "" | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
}

function addCountFromAccessLogs() {
  { echo -e "$1\t"; grep "$2" $APP_ACCESS_LOG_PATTERN | grep -c "$2"; } | sed ':a;N;s/\n//;ba' | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
}

function addBonusLinesForSearch() {
  # At least for the time being, partOf search requests can comprise more than 75% of a performance test's
  # search requests.  Until this changes, we want to call this count out.
  { echo -e "partOf search requests\t"; grep "requestCompleted" $APP_ERROR_LOG_PATTERN | grep -c "criteria\":{\"partOf"; } | sed ':a;N;s/\n//;ba' | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
  echo -e "" >> $ALL_REQUESTS_METRICS_TSV_FILE
  { echo -e "Failed search requests\t"; grep "requestCompleted" $APP_ERROR_LOG_PATTERN | grep -c "\"requestCompleted\":false"; } | sed ':a;N;s/\n//;ba' | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
  echo -e "" | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
}

function addBonusLinesForDocuments() {
  { echo -e "No profile specified\t"; grep "LuxNamedProfiles" $APP_ERROR_LOG_PATTERN | grep -c "without applying a profile"; } | sed ':a;N;s/\n//;ba' | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
  { echo -e "Location profile\t"; grep "LuxNamedProfiles" $APP_ERROR_LOG_PATTERN | grep -c "location"; } | sed ':a;N;s/\n//;ba' | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
  { echo -e "Name profile\t"; grep "LuxNamedProfiles" $APP_ERROR_LOG_PATTERN | grep -c "name"; } | sed ':a;N;s/\n//;ba' | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
  { echo -e "Relationship profile\t"; grep "LuxNamedProfiles" $APP_ERROR_LOG_PATTERN | grep -c "relationship"; } | sed ':a;N;s/\n//;ba' | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
  { echo -e "Results profile\t"; grep "LuxNamedProfiles" $APP_ERROR_LOG_PATTERN | grep -c "results"; } | sed ':a;N;s/\n//;ba' | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
  { echo -e "Other known profiles\t"; grep "LuxNamedProfiles" $APP_ERROR_LOG_PATTERN | 
    grep -v "without applying a profile" |
    grep -v "location" |
    grep -v "name" |
    grep -v "relationship" |
    grep -v "results" |
    grep -c "LuxNamedProfiles"; } | sed ':a;N;s/\n//;ba' | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
  { echo -e "Unknown profiles\t"; grep "An unknown profile was requested" $APP_ERROR_LOG_PATTERN | grep -c "profile"; } | sed ':a;N;s/\n//;ba' | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
  echo -e "" | tee -a $ALL_REQUESTS_METRICS_TSV_FILE
}

[[ -d "$OUTPUT_DIRECTORY" ]] || mkdir "$OUTPUT_DIRECTORY"

# Beginning of report
echo -e "Description:" > $ALL_REQUESTS_METRICS_TSV_FILE
echo -e "" >> $ALL_REQUESTS_METRICS_TSV_FILE
echo -e "End time:" >> $ALL_REQUESTS_METRICS_TSV_FILE
echo -e "Start time:" >> $ALL_REQUESTS_METRICS_TSV_FILE
echo -e "Duration in minutes:\t=(B3-B4)*1440" >> $ALL_REQUESTS_METRICS_TSV_FILE
echo -e "Duration in seconds:\t=(B3-B4)*86400" >> $ALL_REQUESTS_METRICS_TSV_FILE
echo -e "" | tee -a  $ALL_REQUESTS_METRICS_TSV_FILE

# An array of cell references for each of the request-specific counts.
TOTAL_FORMULA=""

# Sections
# The pattern for search requests include successful and unsuccessful requests.
grepForSectionCounts "SEARCH REQUESTS" "requestCompleted" "\"total\":" ","
CURRENT_ROW=$(wc -l $ALL_REQUESTS_METRICS_TSV_FILE | sed -e 's/[^0-9]//g')
SUB_TOTAL_ROW=$((CURRENT_ROW - 2))
TOTAL_FORMULA+="B$SUB_TOTAL_ROW"
addBonusLinesForSearch

# The pattern for facet requests include successful and unsuccessful requests.
grepForSectionCounts "FACET REQUESTS" "LuxFacets" "in " " milli"
CURRENT_ROW=$(wc -l $ALL_REQUESTS_METRICS_TSV_FILE | sed -e 's/[^0-9]//g')
SUB_TOTAL_ROW=$((CURRENT_ROW - 2))
TOTAL_FORMULA+="+B$SUB_TOTAL_ROW"

grepForSectionCounts "RELATED LIST REQUESTS\tExcludes searchWillMatch calls." "LuxRelatedList" "Created .* in " " milli"
CURRENT_ROW=$(wc -l $ALL_REQUESTS_METRICS_TSV_FILE | sed -e 's/[^0-9]//g')
SUB_TOTAL_ROW=$((CURRENT_ROW - 2))
TOTAL_FORMULA+="+B$SUB_TOTAL_ROW"

grepForSectionCounts "SEARCH WILL MATCH REQUESTS" "LuxSearch" "Checked [0-9]* searches in " " milli"
CURRENT_ROW=$(wc -l $ALL_REQUESTS_METRICS_TSV_FILE | sed -e 's/[^0-9]//g')
SUB_TOTAL_ROW=$((CURRENT_ROW - 2))
TOTAL_FORMULA+="+B$SUB_TOTAL_ROW"

grepForSectionCounts "SEARCH ESTIMATE REQUESTS" "LuxSearch" "Calculated estimate in " " milli"
CURRENT_ROW=$(wc -l $ALL_REQUESTS_METRICS_TSV_FILE | sed -e 's/[^0-9]//g')
SUB_TOTAL_ROW=$((CURRENT_ROW - 2))
TOTAL_FORMULA+="+B$SUB_TOTAL_ROW"

grepForSectionCounts "DOCUMENT REQUESTS" "LuxNamedProfiles" "in " " milli"
CURRENT_ROW=$(wc -l $ALL_REQUESTS_METRICS_TSV_FILE | sed -e 's/[^0-9]//g')
SUB_TOTAL_ROW=$((CURRENT_ROW - 2))
TOTAL_FORMULA+="+B$SUB_TOTAL_ROW"
addBonusLinesForDocuments

# Add a row per request type that we do not (yet?) have durations for.  These come from the access logs.
echo -e "OTHER REQUESTS\tCounts only." >> $ALL_REQUESTS_METRICS_TSV_FILE
addCountFromAccessLogs "Advanced search configuration" "/ds/lux/advancedSearchConfig.mjs"
addCountFromAccessLogs "Auto complete" "/ds/lux/autoComplete.mjs"
addCountFromAccessLogs "Person roles" "/ds/lux/personRoles.mjs"
addCountFromAccessLogs "Search info" "/ds/lux/searchInfo.mjs"
addCountFromAccessLogs "Stats" "/ds/lux/stats.mjs"
addCountFromAccessLogs "Translate" "/ds/lux/translate.mjs"
CURRENT_ROW=$(wc -l $ALL_REQUESTS_METRICS_TSV_FILE | sed -e 's/[^0-9]//g')
END_SUM_ROW=$CURRENT_ROW
START_SUM_ROW=$((END_SUM_ROW - 6))
echo -e "Sub-Total\t=SUM(B$START_SUM_ROW:B$END_SUM_ROW)" >> $ALL_REQUESTS_METRICS_TSV_FILE
CURRENT_ROW=$(wc -l $ALL_REQUESTS_METRICS_TSV_FILE | sed -e 's/[^0-9]//g')
TOTAL_FORMULA+="+B$CURRENT_ROW"

# Grand total
echo "" >> $ALL_REQUESTS_METRICS_TSV_FILE
echo -e "Total number of requests\t=$TOTAL_FORMULA" >> $ALL_REQUESTS_METRICS_TSV_FILE
echo -e "" | tee -a  $ALL_REQUESTS_METRICS_TSV_FILE

echo -e "Adding up the number of requests by status code..."
echo -e "" >> "$ALL_REQUESTS_METRICS_TSV_FILE"
echo -e "REQUEST COUNTS BY RESPONSE STATUS CODE" >> "$ALL_REQUESTS_METRICS_TSV_FILE"
echo -e "Count\tStatus Code" >> "$ALL_REQUESTS_METRICS_TSV_FILE"
grep -o "\" [0-9][0-9][0-9] [0-9]" *AccessLog* | grep -o " [0-9][0-9][0-9] " | sort | uniq -c | sed -e 's/[ ]*//' | sed 's/  /\t/' >> "$ALL_REQUESTS_METRICS_TSV_FILE"

echo -e "" | tee -a  $ALL_REQUESTS_METRICS_TSV_FILE
echo "Generating additional files..."

# All successful requests and some unsuccessful requests --probably should become consistent.
# These regular expressions should align with those sent into grepForSectionCounts.
echo -e "   $ALL_REQUESTS_FILE..."
PATTERN_SEARCH_REQUESTS="requestCompleted"
PATTERN_FACET_REQUESTS="\[Event:id=LuxFacets\] .* in .* milli"
PATTERN_RELATED_LIST_REQUESTS="\[Event:id=LuxRelatedList\] Created .* in .* milli"
PATTERN_SEARCH_WILL_MATCH_REQUESTS="\[Event:id=LuxSearch\] Checked .* searches in .* milli"
PATTERN_SEARCH_ESTIMATE_REQUESTS="\[Event:id=LuxSearch\] Calculated estimate in .* milli"
PATTERN_DOCUMENT_REQUESTS="\[Event:id=LuxNamedProfiles\] .* in .* milli"
grep -e "$PATTERN_SEARCH_REQUESTS" \
     -e "$PATTERN_FACET_REQUESTS" \
     -e "$PATTERN_RELATED_LIST_REQUESTS" \
     -e "$PATTERN_SEARCH_WILL_MATCH_REQUESTS" \
     -e "$PATTERN_SEARCH_ESTIMATE_REQUESTS" \
     -e "$PATTERN_DOCUMENT_REQUESTS" \
     $APP_ERROR_LOG_PATTERN \
     > $ALL_REQUESTS_FILE

# Create a TSV out of the all requests file via multiple sed commands.
echo -e "   $ALL_REQUESTS_TSV_FILE... Coffee break!"
echo -e "Source\tTimestamp\tSearch (ms)\tFacet (ms)\tRelated List (ms)\tWill Match\tEstimate\tDocument" > "$ALL_REQUESTS_TSV_FILE"
cat "$ALL_REQUESTS_FILE" >> "$ALL_REQUESTS_TSV_FILE"
echo -e "      Processing Search requests..."
sed -i \
    "s/\(.*txt\):\(.*\) Info: \[Event:id=LuxSearch\] .* \"milliseconds\":{\"total\":\([0-9]*\)[^0-9].*/\1\t\2\t\3/" \
    "$ALL_REQUESTS_TSV_FILE"
echo -e "      Processing Facet requests..."
sed -i \
    "s/\(.*txt\):\(.*\) Info: \[Event:id=LuxFacets\] .* in \([0-9]*\) milli.*/\1\t\2\t\t\3/" \
    "$ALL_REQUESTS_TSV_FILE"
echo -e "      Processing Related List requests..."
sed -i \
    "s/\(.*txt\):\(.*\) Info: \[Event:id=LuxRelatedList\] .* in \([0-9]*\) milli.*/\1\t\2\t\t\t\3/" \
    "$ALL_REQUESTS_TSV_FILE"
echo -e "      Processing Searches Will Match requests..."
sed -i \
    "s/\(.*txt\):\(.*\) Info: \[Event:id=LuxSearch\] Checked .* searches in \([0-9]*\) milli.*/\1\t\2\t\t\t\t\3/" \
    "$ALL_REQUESTS_TSV_FILE"
echo -e "      Processing Search Estimate requests..."
sed -i \
    "s/\(.*txt\):\(.*\) Info: \[Event:id=LuxSearch\] Calculated estimate in \([0-9]*\) milli.*/\1\t\2\t\t\t\t\t\3/" \
    "$ALL_REQUESTS_TSV_FILE"
echo -e "      Processing Document requests..."
sed -i \
    "s/\(.*txt\):\(.*\) Info: \[Event:id=LuxNamedProfiles\] .* in \([0-9]*\) milli.*/\1\t\2\t\t\t\t\t\t\3/" \
    "$ALL_REQUESTS_TSV_FILE"
# Add rows for filtered and unfiltered counts.  This needs to be updated after adding or removing a column.
CURRENT_ROW=$(wc -l $ALL_REQUESTS_TSV_FILE | sed -e 's/[^0-9]//g')
echo -e "Filtered Counts\t\t=SUBTOTAL(2, C2:C$CURRENT_ROW)\t=SUBTOTAL(2, D2:D$CURRENT_ROW)\t=SUBTOTAL(2, E2:E$CURRENT_ROW)\t=SUBTOTAL(2, F2:F$CURRENT_ROW)\t=SUBTOTAL(2, G2:G$CURRENT_ROW)\t=SUBTOTAL(2, H2:H$CURRENT_ROW)" >> $ALL_REQUESTS_TSV_FILE
echo -e "Unfiltered Counts\t\t=COUNT(C2:C$CURRENT_ROW)\t=COUNT(D2:D$CURRENT_ROW)\t=COUNT(E2:E$CURRENT_ROW)\t=COUNT(F2:F$CURRENT_ROW)\t=COUNT(G2:G$CURRENT_ROW)\t=COUNT(H2:H$CURRENT_ROW)" >> $ALL_REQUESTS_TSV_FILE

# All completed search requests w/ durations.
echo -e "   $SEARCH_PARAMS_WITH_DURATIONS_FILE..."
grep "searchElapsed" $APP_ERROR_LOG_PATTERN > $SEARCH_PARAMS_WITH_DURATIONS_FILE
echo -e "See also\t$SEARCH_PARAMS_WITH_DURATIONS_FILE" >> $ALL_REQUESTS_METRICS_TSV_FILE

# Create a TSV-formatted report out of the above file
echo -e "   $SEARCH_PARAMS_WITH_DURATIONS_TSV_FILE..."
echo -e "Timestamp\tRequest ID\tContext\tFiltered\tTotal Duration (ms)\tSearch Duration (ms)\tEstimate\tReturned\tScope\tCriteria" > "$SEARCH_PARAMS_WITH_DURATIONS_TSV_FILE"
# Switched to Perl as sed only supports 9 backreferences and awk was taking too long to figure out.
# The regular expression requires the line start with a file name (*.txt)
# Keep the following regular expression in sync with one in the next section.
perl -pe 's/^.*txt:(.*) Info: .* requestId: ([^;]+); requestContext: ([^;]+); filterResults: ([^;]+); totalElapsed: ([0-9]+); searchElapsed: ([0-9]+); estimate: ([0-9]+); returned: ([0-9]+); scope: \[([^\]]+)\]; searchCriteria: \[(.*)\]$/$1\t$2\t$3\t$4\t$5\t$6\t$7\t$8\t$9\t$10/' "$SEARCH_PARAMS_WITH_DURATIONS_FILE" >> "$SEARCH_PARAMS_WITH_DURATIONS_TSV_FILE"
echo -e "See also\t$SEARCH_PARAMS_WITH_DURATIONS_TSV_FILE" >> $ALL_REQUESTS_METRICS_TSV_FILE

# Convert the search params info into JSON
echo -e "   $SEARCH_PARAMS_WITH_DURATIONS_JSON_FILE..."
echo -e "{\"requests\": [" > "$SEARCH_PARAMS_WITH_DURATIONS_JSON_FILE"
# Keep the following regular expression in sync with one in the previous section.
perl -pe 's/^.*txt:(.*) Info: .* requestId: ([^;]+); requestContext: ([^;]+); filterResults: ([^;]+); totalElapsed: ([0-9]+); searchElapsed: ([0-9]+); estimate: ([0-9]+); returned: ([0-9]+); scope: \[([^\]]+)\]; searchCriteria: \[(.*)\]$/{"timestamp": "$1", "requestId": "$2", "requestContext": "$3", "filterResults": $4, "total": $5, "search": $6, "estimate": $7, "returned": $8, "scope": "$9", "criteria": $10},/' "$SEARCH_PARAMS_WITH_DURATIONS_FILE" >> "$SEARCH_PARAMS_WITH_DURATIONS_JSON_FILE"
echo -e "{\"hereForLastComma\": true}" >> "$SEARCH_PARAMS_WITH_DURATIONS_JSON_FILE"
echo -e "]}" >> "$SEARCH_PARAMS_WITH_DURATIONS_JSON_FILE"
echo -e "See also\t$SEARCH_PARAMS_WITH_DURATIONS_JSON_FILE" >> $ALL_REQUESTS_METRICS_TSV_FILE

# Long running searches
echo -e "   $SEARCHES_LONG_RUNNING_FILE..."
grep "requestCompleted" $APP_ERROR_LOG_PATTERN | grep -E "total\":[2-9][0-9]{4}" > $SEARCHES_LONG_RUNNING_FILE
echo -e "See also\t$SEARCHES_LONG_RUNNING_FILE" >> $ALL_REQUESTS_METRICS_TSV_FILE

# Failed search requests.
echo -e "   $FAILED_SEARCH_REQUESTS_FILE..."
grep "requestCompleted" $APP_ERROR_LOG_PATTERN | grep "\"requestCompleted\":false" > $FAILED_SEARCH_REQUESTS_FILE
echo -e "See also\t$FAILED_SEARCH_REQUESTS_FILE" >> $ALL_REQUESTS_METRICS_TSV_FILE

# Failed searchEstimate requests.
echo -e "   $FAILED_SEARCH_ESTIMATE_REQUESTS_FILE..."
grep "Search Estimate errored out" $APP_ERROR_LOG_PATTERN > $FAILED_SEARCH_ESTIMATE_REQUESTS_FILE
echo -e "See also\t$FAILED_SEARCH_ESTIMATE_REQUESTS_FILE" >> $ALL_REQUESTS_METRICS_TSV_FILE

# Failed searchWillMatch requests.
echo -e "   $FAILED_SEARCH_WILL_MATCH_REQUESTS_FILE..."
grep "Search Will Match errored out" $APP_ERROR_LOG_PATTERN > $FAILED_SEARCH_WILL_MATCH_REQUESTS_FILE
echo -e "See also\t$FAILED_SEARCH_WILL_MATCH_REQUESTS_FILE" >> $ALL_REQUESTS_METRICS_TSV_FILE

# All facet requests
echo -e "   $FACET_REQUESTS_FILE..."
grep "Calculated the following facet" $APP_ERROR_LOG_PATTERN > $FACET_REQUESTS_FILE
echo -e "See also\t$FACET_REQUESTS_FILE" >> $ALL_REQUESTS_METRICS_TSV_FILE

# All failed facet requests
echo -e "   $FAILED_FACET_REQUESTS_FILE..."
grep "Failed to calculate" $APP_ERROR_LOG_PATTERN > $FAILED_FACET_REQUESTS_FILE
echo -e "See also\t$FAILED_FACET_REQUESTS_FILE" >> $ALL_REQUESTS_METRICS_TSV_FILE

# Part of a searchWillMatch request, let's see how long it took to determine if a related list contains at least one item
echo -e "   $AT_LEAST_ONE_RELATED_LIST_ITEM_FILE..."
grep "LuxRelatedList\] Checked" $APP_ERROR_LOG_PATTERN > $AT_LEAST_ONE_RELATED_LIST_ITEM_FILE
echo -e "See also\t$AT_LEAST_ONE_RELATED_LIST_ITEM_FILE" >> $ALL_REQUESTS_METRICS_TSV_FILE

# Create a report out of the above file
echo -e "   $AT_LEAST_ONE_RELATED_LIST_ITEM_TSV_FILE..."
echo -e "Timestamp\tRelations Checked\tRelated List\tScope\tURI\tHas?\tDuration (ms)" > "$AT_LEAST_ONE_RELATED_LIST_ITEM_TSV_FILE"
cat "$AT_LEAST_ONE_RELATED_LIST_ITEM_FILE" >> "$AT_LEAST_ONE_RELATED_LIST_ITEM_TSV_FILE"
# The following sed command expects its input lines to begin with a file name.
sed -i "s/.*txt:\(.*\) Info: \[Event:id=LuxRelatedList] Checked \([0-9]*\) .* '\([a-zA-Z]*\)' .* '\([a-zA-Z]*\)' for '\([^']*\)' \(.*\) at least .* \([0-9]*\) milli.*/\1\t\2\t\3\t\4\t\5\t\6\t\7/" "$AT_LEAST_ONE_RELATED_LIST_ITEM_TSV_FILE"
echo -e "See also\t$AT_LEAST_ONE_RELATED_LIST_ITEM_TSV_FILE" >> $ALL_REQUESTS_METRICS_TSV_FILE

# Find out which related list relation + IRI combinations hit the request's maximum number of relations per relationship.
echo -e "   $HIT_MAX_NUMBER_OF_RELATIONS..."
grep "Hit the max" $APP_ERROR_LOG_PATTERN > $HIT_MAX_NUMBER_OF_RELATIONS
echo -e "See also\t$HIT_MAX_NUMBER_OF_RELATIONS" >> $ALL_REQUESTS_METRICS_TSV_FILE

# Failed related list requests (searchWillMatch and relatedList endpoint requests)
echo -e "   $FAILED_RELATED_LIST_REQUESTS..."
PATTERN_1="Unable to determine the '[a-zA-Z]*' list"
PATTERN_2="Failed to create the '[a-zA-Z]*' list"
grep -e "$PATTERN_1" -e "$PATTERN_2" $APP_ERROR_LOG_PATTERN > $FAILED_RELATED_LIST_REQUESTS
echo -e "See also\t$FAILED_RELATED_LIST_REQUESTS" >> $ALL_REQUESTS_METRICS_TSV_FILE

# We have a few conditions/errors that it's not clear if they would happen in the wild.
echo -e "   $ODD_RELATED_LIST_ERRORS..."
PATTERN_1="Unable to determine the inverse search term"
PATTERN_2="Unable to determine search term name"
PATTERN_3="Providing search criteria for the '[a-zA-Z]*' scope"
grep -e "$PATTERN_1" -e "$PATTERN_2" -e "$PATTERN_3" $APP_ERROR_LOG_PATTERN > $ODD_RELATED_LIST_ERRORS
echo -e "See also\t$ODD_RELATED_LIST_ERRORS" >> $ALL_REQUESTS_METRICS_TSV_FILE

# Potentially interesting entries from ML's main error logs (not port specific)
echo -e "   $ERROR_LOG_ABOVE_INFO_FILE..."
ls | egrep $ERROR_LOG_EGREP_PATTERN_MAIN | xargs grep -v Info | grep -v Debug > $ERROR_LOG_ABOVE_INFO_FILE
echo -e "See also\t$ERROR_LOG_ABOVE_INFO_FILE" >> $ALL_REQUESTS_METRICS_TSV_FILE

echo -e ""
echo -e "Done"
