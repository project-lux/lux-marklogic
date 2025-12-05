#!/bin/bash

# This script merges log files from a source directory into corresponding files in a destination directory.
# It appends the contents of each file from the source directory to the matching file in the destination
# directory (files are matched by filename).
#
# WARNING: This script does NOT create backup files before modifying the destination files.
#
# Originally created for testing dynamic hosts in MarkLogic clusters, where log files needed to be
# consolidated after clearing the data directory, which was required before a dynamic host could
# rejoin the main cluster.

# Source and target directories
SRC_DIR="./newer-logs"
DEST_DIR="./append-to-these-logs"

# Loop through each file in the source directory
for src_file in "$SRC_DIR"/*; do
    # Extract the filename (without path)
    filename=$(basename "$src_file")
    
    # Define the target file path
    dest_file="$DEST_DIR/$filename"
    
    # Check if the target file exists
    if [[ -f "$dest_file" ]]; then
        echo "Appending $filename to $dest_file"
        cat "$src_file" >> "$dest_file"
    else
        echo "Target file $dest_file does not exist. Skipping."
    fi
done

