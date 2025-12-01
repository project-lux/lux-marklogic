#!/bin/bash
#
# Convenience script to recreate the addDynamicHost.sh script by pasting from source.
#
script=/usr/local/bin/addDynamicHost.sh
sudo rm $script
sudo vi $script
sudo chown daemon:daemon $script
sudo chmod 744 $script