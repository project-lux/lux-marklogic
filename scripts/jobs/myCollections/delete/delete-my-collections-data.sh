#!/bin/bash
#
# This script deletes 'prod' or 'nonProd' My Collections data from a MarkLogic database using 
# Flux's reprocess command.
#
# It can be run interactively or headless. If an error occurs, the script appends an error
# message to /var/opt/MarkLogic/Logs/ErrorLog.txt. This log should be monitored so a system
# administrator is notified. The unique string included is "My Collections delete failed".
#
# The script requires one parameter: the Flux options file to use.
#
# Prerequisites:
#
# - Set up on one node in a MarkLogic cluster (else, the script cannot write to the log).
# - Speaking of which, make sure the process owner can write to the log file.
# - Flux must be in FLUX_HOME/bin or, if not set, in PATH. Flux 1.3.0 was used for development.
#   Download Flux from https://github.com/marklogic/flux/releases.
#   Or: curl -L https://github.com/marklogic/flux/releases/download/1.3.0/marklogic-flux-1.3.0.zip > marklogic-flux-1.3.0.zip
# - Flux requires Java and first checks JAVA_HOME/bin; else Java must be in PATH (found via `which`).
#   Java 17.0.8 was used during development.
# - If Flux's options file uses --s3-add-credentials, AWS CLI must be installed and configured.
# - Define MarkLogic connection details in the Flux options file, as well as the S3 bucket path.
#   The MarkLogic user must have the "%%mlAppName%%-my-collections-data-updater" role (preferred)
#   or admin role.
#

die () {
    # Write error message to a monitored MarkLogic log file.
    echo "$(date '+%Y-%m-%d %H:%M:%S') My Collections delete failed: $1" >> /var/opt/MarkLogic/Logs/ErrorLog.txt

    script=`basename "$0"`
    echo >&2 ""
    echo >&2 "$1"
    echo >&2 ""
    if [ "$2" = true ]; then
        echo >&2 "Usage: $script [fluxOptionsFile] [collectionName] [additional Flux options]"
        echo >&2 ""
        echo >&2 "Example: $script delete-options.txt nonProd --password \"batman\""
        echo >&2 ""
    fi
    exit 1
}

findExecutable() {
    local envVarValue="$1"
    local subDir="$2"
    local fileName="$3"
    local execPath

    # If environment variable is set, construct the path
    if [ -n "$envVarValue" ]; then
        if [ -n "$subDir" ]; then
            execPath="$envVarValue/$subDir/$fileName"
        else
            execPath="$envVarValue/$fileName"
        fi
        if [ -x "$execPath" ]; then
            echo "$execPath"
            return 0
        fi
    fi

    # Check if the filename is in PATH
    # Note that Flux uses `which` and if not installed, will tell you it can't find Java.
    if command -v "$fileName" >/dev/null 2>&1; then
        echo "$fileName"
        return 0
    fi

    die "Executable not found using environment variable or in PATH: $fileName" false
}

fluxOptionsFile="$1"
if [ ! -f "$fluxOptionsFile" ]; then
    die "Flux options file not found: $fluxOptionsFile" true
fi

collectionName="$2"
if [ -z "$collectionName" ]; then
    die "Collection name is required as the second parameter." true
fi

# Collection name restriction: restrict to these two.
[ "$collectionName" = "prod" ] || [ "$collectionName" = "nonProd" ] || \
    die "The collectionName parameter must be 'prod' or 'nonProd'." true

readJavaScript="cts.uris('', null, cts.collectionQuery('$collectionName'))"
writeJavaScript="declareUpdate(); var URI; xdmp.documentDelete(URI);"

# Support *_HOME environment variables, falling back on PATH.
echo "Locating executables..."
awsCliExec=$(findExecutable "$AWS_CLI_HOME" "" "aws") || exit 1
javaExec=$(findExecutable "$JAVA_HOME" "bin" "java")  || exit 1
fluxExec=$(findExecutable "$FLUX_HOME" "bin" "flux")  || exit 1

echo "Deleting My Collections data..."
output=$($fluxExec reprocess @"$fluxOptionsFile" \
    --read-javascript "$readJavaScript" \
    --write-javascript "$writeJavaScript" \
    "${@:3}" 2>&1 | tee /dev/stderr) || \
    die "Flux reprocess failed: $output" true
