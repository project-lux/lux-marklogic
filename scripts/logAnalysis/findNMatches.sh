#!/usr/bin/env bash

# Finds a contiguous slice of log lines that contains a target number of
# matching lines and writes that full slice to ./matches.
#
# Original use case:
#   We wanted the log entries associated to a random 10K contiguous search
#   requests in order to generate new parity test configurations.
#
# How it works:
#   - Scans each ./*.txt file in the current directory.
#   - Chooses a random starting line between 1 and START_PCT percent of the
#     file length.
#   - Looks for lines matching REGEX at or after that starting line.
#   - When it finds the first match, it starts copying every subsequent line
#     to an output file.
#   - Stops after TARGET matching lines have been seen, preserving the full
#     contiguous log block from the first match through the TARGETth match.
#
# Usage:
#   - Run from the directory that contains the log .txt files.
#   - Command: ./findNMatches.sh
#   - Output files are written under ./matches.
#
# Tunables:
#   - TARGET: number of matching lines to capture.
#   - START_PCT: upper bound for the randomized starting position, expressed
#     as a percentage of total file length.
#   - REGEX: identifies which log lines count as search-request matches.
#
# Output:
#   - For each input file, writes ./matches/${TARGET}-from-${base}.txt when at
#     least one match is found after the randomized starting point.
#   - Prints a summary showing the random start, captured line range, and how
#     many matching lines were found.

TARGET=10000
START_PCT=75
REGEX='Search .* parameters'

for file in ./*.txt; do
  [ -f "$file" ] || continue

  total_lines=$(wc -l < "$file")

  if [ "$total_lines" -eq 0 ]; then
    echo "$file: empty file"
    continue
  fi

  max_start=$(( total_lines * START_PCT / 100 ))
  [ "$max_start" -lt 1 ] && max_start=1

  random_start=$(awk -v max="$max_start" -v seed="$(date +%s%N)" '
  BEGIN {
      srand(seed)
      print int(rand() * max) + 1
  }')

  base="${file##*/}"
  base="${base%.*}"
  mkdir -p "./matches"
  output_file="./matches/${TARGET}-from-${base}.txt"

  LC_ALL=C gawk \
    -v re="$REGEX" \
    -v target="$TARGET" \
    -v start_line="$random_start" \
    -v output_file="$output_file" '
      FNR < start_line {
        next
      }

      {
        matched = ($0 ~ re)

        if (matched) {
          count++

          if (count == 1) {
            first_match = FNR
          }
        }

        # Once the first match is found, write every line in the range,
        # not just the matching lines.
        if (first_match > 0) {
          print $0 > output_file
        }

        if (matched && count == target) {
          close(output_file)

          printf "%s: random_start=%d, line_range=%d-%d (%d matching lines), output=%s\n",
                 FILENAME, start_line, first_match, FNR, count, output_file

          found = 1
          nextfile
        }
      }

      ENDFILE {
        if (!found) {
          close(output_file)

          if (count > 0) {
            printf "%s: random_start=%d, only %d matches, line_range=%d-%d, output=%s\n",
                   FILENAME, start_line, count, first_match, FNR, output_file
          } else {
            printf "%s: random_start=%d, no matches found\n",
                   FILENAME, start_line

            # Remove stale/empty output file if no matches were found
            system("rm -f \"" output_file "\"")
          }
        }

        count = 0
        first_match = 0
        found = 0
      }
    ' "$file"

done
