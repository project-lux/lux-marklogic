#!/bin/bash

# Script to execute a given command in every subdirectory
# Usage: ./executeInSubDirs.sh "command to execute"
# 
# Examples:
#   ./executeInSubDirs.sh 'grep -c "requests":[^1] *RequestLog*'
#   ./executeInSubDirs.sh "ls -la"
#   ./executeInSubDirs.sh find . -name "*.log"
#
# Tips for quoting:
#   - Use single quotes to avoid shell interpretation: 'grep -c "pattern" files'
#   - Pass multiple arguments without outer quotes: find . -name "*.log"
#   - Use $'...' for commands with special characters: $'grep -c "requests\":[^1]" *RequestLog*'

# Check if command argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 \"command to execute\""
    echo ""
    echo "Examples:"
    echo "  $0 'grep -c \"requests\":[^1] *RequestLog*'"
    echo "  $0 \"ls -la\""
    echo "  $0 find . -name \"*.log\""
    echo ""
    echo "Tips:"
    echo "  - Use single quotes to preserve double quotes"
    echo "  - Pass multiple arguments without outer quotes"
    echo "  - Use \$'...' for complex escaping"
    exit 1
fi

# Store all arguments as the command to execute
# This allows passing commands without outer quotes
if [ $# -eq 1 ]; then
    COMMAND="$1"
else
    COMMAND="$*"
fi

# Get the current directory
CURRENT_DIR=$(pwd)

echo "Executing command: $COMMAND"
echo "In all subdirectories of: $CURRENT_DIR"
echo "=================================="

# Find all subdirectories and execute the command in each
for dir in */; do
    # Check if it's actually a directory
    if [ -d "$dir" ]; then
        echo ""
        echo "--- Executing in directory: $dir ---"
        cd "$dir"
        
        # Execute the command and capture exit status
        eval "$COMMAND"
        EXIT_STATUS=$?
        
        # Return to parent directory
        cd "$CURRENT_DIR"
        
        # Print status
        if [ $EXIT_STATUS -eq 0 ]; then
            echo "Command completed successfully in $dir"
        else
            echo "Command failed with exit status $EXIT_STATUS in $dir"
        fi
    fi
done

echo ""
echo "=================================="
echo "Finished executing command in all subdirectories"
