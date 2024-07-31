#
# This script may be used to create a tab-delimited file of merge entries from ErrorLog files,
# which may then be used to graph the merge rate over the duration, after sorting by timestamp.
#
# Use in conjuction with collectBackendLogs.sh and trimBackendLogs.sh.
#
# This script expects multiple ErrorLog files (in the current directory) and would need to be
# modified to support a single ErrorLog file.
#
OUTPUT_FILE=./merge-info.tsv
rm "$OUTPUT_FILE"
echo "Node\tTimestamp\tMB\tSeconds\tMB/sec" > "$OUTPUT_FILE"
grep "Info: Merged [0-9]* MB in " *.txt >> "$OUTPUT_FILE"
sed -i \
    "s/\(.*txt\):\(.*\) Info: Merged \([0-9]*\) MB in \([0-9]*\) sec at \([0-9]*\) .*/\1\t\2\t\3\t\4\t\5/" \
    "$OUTPUT_FILE"
