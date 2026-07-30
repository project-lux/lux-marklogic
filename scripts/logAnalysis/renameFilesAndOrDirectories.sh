#!/bin/sh
#
# Replace a string in file and/or directory names.
#
# Usage:
#
# 1. Update the find command's -name parameter to match target files.
# 2. Update the sed command to specify the string to replace and what to replace with.
# 3. To flip to directories, change '-type f' to '-type d'.  You can try to remove the
#    -type parameter but expect an error if the target path and file includes the string
#    replace multiple times.
# 4. Duplicate the loop to perform multiple string replacements in one pass.
#
find . -name '*.mjs' | while read FILE ; do
    newfile="$(echo ${FILE} |sed -e 's/.mjs/Tests.mjs/')" ;
    mv "${FILE}" "${newfile}" ;
done
