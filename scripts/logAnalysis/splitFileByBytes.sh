#!/bin/bash

die () {
    script=$(basename "$0")
    echo >&2 ""
    echo >&2 "$@"
    echo >&2 ""
    echo >&2 "Usage: $script [input-file] [max-bytes-per-file]"
    echo >&2 ""
    echo >&2 "Example: $script /tmp/request.log 1048576"
    echo >&2 ""
    exit 1
}

[ "$#" -eq 2 ] || die "Exactly two parameters are required: input file and max bytes per file."

input_file="$1"
max_bytes="$2"

[ -f "$input_file" ] || die "Input file was not found: $input_file"
[[ "$max_bytes" =~ ^[1-9][0-9]*$ ]] || die "Max bytes must be a positive integer: $max_bytes"

byte_count=$(wc -c < "$input_file")
if [ "$byte_count" -eq 0 ]; then
    die "Input file has 0 bytes; nothing to split."
fi

chunk_count=$(( (byte_count + max_bytes - 1) / max_bytes ))
suffix_width=${#chunk_count}
if [ "$suffix_width" -lt 2 ]; then
    suffix_width=2
fi

input_dir=$(dirname "$input_file")
input_name=$(basename "$input_file")

if [[ "$input_name" == *.* && "$input_name" != .* ]]; then
    base_name="${input_name%.*}"
    extension=".${input_name##*.}"
else
    base_name="$input_name"
    extension=""
fi

output_prefix="$input_dir/$base_name-"

# Avoid accidental overwrite of prior split outputs.
if compgen -G "$input_dir/$base_name-[0-9]*$extension" > /dev/null; then
    die "Existing split files detected for prefix '$base_name-'. Move/delete them and try again."
fi

split -b "$max_bytes" -d -a "$suffix_width" --numeric-suffixes=1 --additional-suffix="$extension" -- "$input_file" "$output_prefix" || die "Split operation failed."

echo "Split complete."
echo "Source file: $input_file"
echo "Source bytes: $byte_count"
echo "Max bytes per file: $max_bytes"
echo "Files created in: $input_dir"
echo "Filename pattern: $base_name-XX$extension"