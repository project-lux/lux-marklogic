#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<'EOF'
Usage:
  grepUniqueCounts.sh --file PATH --regex REGEX [--ignore-case] [--perl] [--inner REGEX]

Description:
  Greps a file for REGEX, outputs unique matches with counts (sorted by count desc).
  By default, prints the full match (-o). If --inner is provided, it post-filters
  matches to extract a sub-part using a second regex (useful for lookarounds portability).

Options:
  --file PATH        File to search (required)
  --regex REGEX      Regex to match (required). Used with grep -o.
  --ignore-case      Case-insensitive search (grep -i)
  --perl             Use PCRE mode (grep -P) if available (required for lookarounds)
  --inner REGEX      Optional regex applied via awk to extract a sub-match from each match.
                     This should be an ERE (awk's regex), not PCRE.
  --help             Show this help

Examples:
  # Count full messages:
  grepUniqueCounts.sh \
    --file 8003_ErrorLog.txt \
    --regex "Couldn't find relation name for '.*'"

  # Count only the relation names inside the quotes (PCRE lookarounds):
  grepUniqueCounts.sh \
    --file 8003_ErrorLog.txt \
    --regex "(?<=Couldn't find relation name for ').*(?=')" \
    --perl

  # Portable extraction of inner content *without* lookarounds (BSD/macOS safe):
  grepUniqueCounts.sh \
    --file 8003_ErrorLog.txt \
    --regex "Couldn't find relation name for '[^']*'" \
    --inner "Couldn't find relation name for '([^']*)'"
EOF
}

# --- Parse named args ---
FILE=""
REGEX=""
IGNORE_CASE=false
PERL_MODE=false
INNER_REGEX=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      FILE=${2:-}; shift 2 ;;
    --regex)
      REGEX=${2:-}; shift 2 ;;
    --ignore-case)
      IGNORE_CASE=true; shift ;;
    --perl)
      PERL_MODE=true; shift ;;
    --inner)
      INNER_REGEX=${2:-}; shift 2 ;;
    --help|-h)
      show_help; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      show_help; exit 2 ;;
  esac
done

# --- Validate inputs ---
if [[ -z "$FILE" || -z "$REGEX" ]]; then
  echo "Error: --file and --regex are required." >&2
  show_help
  exit 2
fi

if [[ ! -f "$FILE" ]]; then
  echo "Error: File not found: $FILE" >&2
  exit 1
fi

# --- Build grep command ---
GREP_OPTS=(-o)
$IGNORE_CASE && GREP_OPTS+=(-i)
if $PERL_MODE; then
  # Some systems (e.g., macOS BSD grep) don't support -P; suggest ggrep if not available.
  if grep -P "" </dev/null 2>/dev/null; then
    GREP_OPTS+=(-P)
  else
    if command -v ggrep >/dev/null 2>&1; then
      GREP_BIN="ggrep"
    else
      echo "Error: Your grep doesn't support -P (PCRE). Install GNU grep (ggrep) or rerun without --perl." >&2
      exit 1
    fi
  fi
fi

GREP_BIN=${GREP_BIN:-grep}

# --- Execute pipeline ---
# 1) grep -o emits only the matched substrings
# 2) optional INNER extraction via awk (ERE capture) to extract subgroup
# 3) sort | uniq -c for counts
# 4) sort -nr to show most frequent first
if [[ -n "$INNER_REGEX" ]]; then
  # INNER_REGEX should have one capturing group for the desired piece
  # Example: "Couldn't find relation name for '([^']*)'"
  $GREP_BIN "${GREP_OPTS[@]}" -- "$REGEX" "$FILE" \
    | awk -v re="$INNER_REGEX" '
        {
          match($0, re, m);
          if (m[1] != "") print m[1];
        }
      ' \
    | sort \
    | uniq -c \
    | sort -nr
else
  $GREP_BIN "${GREP_OPTS[@]}" -- "$REGEX" "$FILE" \
    | sort \
    | uniq -c \
    | sort -nr
fi
