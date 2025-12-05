#!/bin/bash

echo "WARNING: This script will:"
echo "  1. Stop MarkLogic service"
echo "  2. Uninstall MarkLogic package"
echo "  3. DELETE the MarkLogic data directory (/var/opt/MarkLogic/)"
echo "  4. Remove temporary MarkLogic RPM files"
echo ""
echo "ALL DATA IN THE MARKLOGIC DATA DIRECTORY WILL BE PERMANENTLY LOST!"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

sudo /usr/bin/systemctl stop MarkLogic
sudo /usr/bin/yum remove MarkLogic
sudo /usr/bin/rm -rf /var/opt/MarkLogic/
rm /tmp/MarkLogic*.rpm
echo "Done"