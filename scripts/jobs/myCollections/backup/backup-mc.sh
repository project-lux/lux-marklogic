#!/bin/bash
#
# The script may be used to backup the My Collections data from a MarkLogic database.
#
# The script requires one parameter: the Flux options file to use.
#
# Prerequisites:
#
# - Flux must be within FLUX_HOME/bin or, when not set, PATH.
#   Flux 1.3.0 was used during development.
#   Flux may be downloaded from https://github.com/marklogic/flux/releases.
# - Flux requires Java and first checks in JAVA_HOME/bin; else needs it in PATH.
#   Java 17.0.8 was used during development.
# - When Flux's options file uses the --s3-add-credentials option, the AWS CLI
#   must be installed and configured with the correct credentials.
# - Define MarkLogic connection details in the Flux options file, as well as the
#   S3 bucket path.
#
# To retain the output, send stdout and/or stderr to a file.
#

die () {
    script=`basename "$0"`
    echo >&2 ""
    echo >&2 "$1"
    echo >&2 ""
    if [ "$2" = true ]; then
        echo >&2 "Usage: $script [fluxOptionsFile]"
        echo >&2 ""
        echo >&2 "Example: $script backup-options.txt"
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
    if command -v "$fileName" >/dev/null 2>&1; then
        echo "$fileName"
        return 0
    fi

    die "Executable not found using environment variable or in PATH: $fileName" false
}

[ "$#" -eq 1 ] || die "Exactly one parameter is required: the Flux options file to use." true

fluxOptionsFile="$1"
if [ ! -f "$fluxOptionsFile" ]; then
    die "Flux options file not found: $fluxOptionsFile" true
fi

# Support *_HOME environment variables, falling back on PATH.
echo "Locating executables..."
awsCliExec=$(findExecutable "$AWS_CLI_HOME" "" "aws") || exit 1
javaExec=$(findExecutable "$JAVA_HOME" "bin" "java")  || exit 1
fluxExec=$(findExecutable "$FLUX_HOME" "bin" "flux")  || exit 1

echo "Backing up My Collections data..."
$fluxExec export-files @"$fluxOptionsFile" || die "Flux export failed." true

