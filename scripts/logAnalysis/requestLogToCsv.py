#!/usr/bin/env python3
"""
Convert MarkLogic request logs to CSV format.  Tested with 150 MB with 438K lines.
Accounts for varying properties across lines by creating a superset of all keys.
"""

import json
import csv
import sys
import os
from typing import Set

def estimate_memory_usage(file_path: str) -> tuple:
    """Estimate memory requirements and suggest processing approach."""
    
    file_size = os.path.getsize(file_path)
    file_size_mb = file_size / (1024 * 1024)
    
    # Sample first few lines to estimate average line size and complexity
    sample_keys = set()
    line_count = 0
    bytes_read = 0
    
    with open(file_path, 'r', encoding='utf-8') as file:
        for i in range(1000):  # Sample first 1000 lines
            try:
                line = file.readline()
                if not line:  # EOF reached
                    break
                if line.strip():
                    try:
                        json_obj = json.loads(line)
                        sample_keys.update(json_obj.keys())
                        line_count += 1
                    except json.JSONDecodeError:
                        continue
            except Exception:
                break
        
        try:
            bytes_read = file.tell()  # Get position before file closes
        except OSError:
            # If tell() fails, estimate based on average line length
            bytes_read = line_count * 200  # Assume ~200 bytes per line as fallback
    
    estimated_total_lines = int(file_size / (bytes_read / line_count)) if line_count > 0 and bytes_read > 0 else 0
    
    return file_size_mb, len(sample_keys), estimated_total_lines

def get_all_keys_streaming(jsonl_file_path: str, chunk_size: int = 10000) -> Set[str]:
    """
    Memory-efficient scanning to collect all unique keys using chunked processing.
    """
    all_keys = set()
    processed_lines = 0
    
    print("Scanning file to identify all unique properties (streaming mode)...")
    
    with open(jsonl_file_path, 'r', encoding='utf-8') as file:
        chunk_keys = set()
        line_number = 0
        
        while True:
            line = file.readline()
            if not line:  # EOF reached
                break
                
            line_number += 1
            if line.strip():
                try:
                    json_obj = json.loads(line)
                    chunk_keys.update(json_obj.keys())
                    processed_lines += 1
                except json.JSONDecodeError as e:
                    if line_number <= 10:  # Only show first few errors
                        print(f"Warning: Skipping malformed JSON on line {line_number}")
                    continue
            
            # Process in chunks to manage memory
            if line_number % chunk_size == 0:
                all_keys.update(chunk_keys)
                chunk_keys.clear()  # Clear chunk to free memory
                print(f"  Processed {line_number:,} lines, found {len(all_keys)} unique properties so far...")
        
        # Add remaining keys from final chunk
        all_keys.update(chunk_keys)
    
    print(f"Scan complete: {len(all_keys)} unique properties across {processed_lines:,} valid lines")
    return all_keys

def convert_jsonl_to_csv_streaming(input_file: str, output_file: str, chunk_size: int = 10000) -> None:
    """
    Memory-efficient conversion using streaming processing.
    """
    
    # Estimate file characteristics
    file_size_mb, sample_keys, estimated_lines = estimate_memory_usage(input_file)
    print(f"File analysis: {file_size_mb:.1f}MB, ~{estimated_lines:,} lines, ~{sample_keys} properties in sample")
    
    # Adjust chunk size based on file size
    if file_size_mb > 500:
        chunk_size = 5000
    elif file_size_mb > 100:
        chunk_size = 10000
    else:
        chunk_size = 20000
    
    print(f"Using chunk size: {chunk_size:,} lines")
    
    # Get all possible columns
    all_keys = get_all_keys_streaming(input_file, chunk_size)
    
    # Sort keys for consistent column ordering
    common_fields = ['time', 'url', 'user', 'elapsedTime', 'requests', 'runTime']
    sorted_keys = []
    
    # Add common fields first (if they exist)
    for field in common_fields:
        if field in all_keys:
            sorted_keys.append(field)
            all_keys.remove(field)
    
    # Add remaining fields alphabetically
    sorted_keys.extend(sorted(all_keys))
    
    print(f"Will create {len(sorted_keys)} columns")
    print(f"First 10 columns: {', '.join(sorted_keys[:10])}")
    
    # Convert to CSV with streaming
    print("Converting to CSV (streaming mode)...")
    
    processed_lines = 0
    error_count = 0
    
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', newline='', encoding='utf-8') as outfile:
        
        writer = csv.DictWriter(outfile, fieldnames=sorted_keys)
        writer.writeheader()
        
        rows_buffer = []
        line_number = 0
        
        while True:
            line = infile.readline()
            if not line:  # EOF reached
                break
                
            line_number += 1
            if line.strip():
                try:
                    json_obj = json.loads(line)
                    
                    # Create row with all columns, filling missing values with empty string
                    row = {key: json_obj.get(key, '') for key in sorted_keys}
                    rows_buffer.append(row)
                    processed_lines += 1
                    
                except json.JSONDecodeError as e:
                    error_count += 1
                    if error_count <= 10:  # Only show first few errors
                        print(f"Warning: Skipping malformed JSON on line {line_number}")
                    continue
            
            # Write in chunks to manage memory
            if len(rows_buffer) >= chunk_size:
                writer.writerows(rows_buffer)
                rows_buffer.clear()  # Clear buffer to free memory
                print(f"  Converted {processed_lines:,} lines...")
        
        # Write remaining rows
        if rows_buffer:
            writer.writerows(rows_buffer)
    
    print(f"Conversion complete!")
    print(f"- Output file: {output_file}")
    print(f"- Total valid lines processed: {processed_lines:,}")
    print(f"- Total columns: {len(sorted_keys)}")
    print(f"- Errors encountered: {error_count}")
    
    # Show final file size
    output_size_mb = os.path.getsize(output_file) / (1024 * 1024)
    print(f"- Output file size: {output_size_mb:.1f}MB")

def main():
    """Main function for the streaming converter."""
    
    if len(sys.argv) != 3:
        print("Memory-Efficient JSONL to CSV Converter")
        print("Optimized for large files (>100MB)")
        print("\nUsage: python convert_jsonl_to_csv_streaming.py input_file.jsonl output_file.csv")
        print("\nThis version uses streaming processing to handle large files efficiently.")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        sys.exit(1)
    
    try:
        convert_jsonl_to_csv_streaming(input_file, output_file)
    except PermissionError:
        print(f"Error: Permission denied when writing to '{output_file}'.")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()