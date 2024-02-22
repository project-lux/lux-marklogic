#!/bin/bash
#set -xe

usage()
{
  echo
  echo "$0 env log"
  echo
  echo where env: sbx, dev, blue, green
  echo       log: ErrorLog.txt, 8003_ErrorLog.txt
}

if [ $# -lt 2 ]; then
  usage
  echo "specify env log"
  exit
fi

env=$1
log=$2

if [ ! -f ./${env}-ips.sh ]; then
  echo "create ${env}-ips.sh to list IPs of all ec2 nodes of the ${env} cluster"
  exit
fi

echo "env: $1"
echo "log: $2"
echo "IP file: ${env}-ips.sh"
. ${env}-ips.sh
echo $node1ip
echo $node2ip
echo $node3ip

for n in 1 2 3
do
 echo ""
 case $n in
 1) ip=$node1ip;;
 2) ip=$node2ip;;
 3) ip=$node3ip;;
 *)
 esac
 echo "Node${n}: ${ip}"
 for s in "Warning:" "Error:" "Critical:" "Alert:" "Emergency:" "Disabled:" "disconnected host"
 do
  echo $s
# echo ssh -i ../ML/ch-lux-ssh-${env}.pem ec2-user@${ip}  grep \"${s}\" /var/opt/MarkLogic/Logs/ErrorLog.txt
       ssh -i ../ML/ch-lux-ssh-${env}.pem ec2-user@${ip}  grep \"${s}\" /var/opt/MarkLogic/Logs/${log}
# echo ""
 done
done
