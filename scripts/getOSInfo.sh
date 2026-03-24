#!/bin/bash

# System Information Gathering Script
# Collects key OS and hardware settings for performance analysis

echo "========================================="
echo "System Information Report"
echo "Date: $(date)"
echo "========================================="

echo
echo "--- PROCESSOR INFORMATION ---"
echo
echo "CPU Cores/Threads:"
echo "Total processing units: $(nproc)"
lscpu | grep -E '^CPU\(s\):|^Thread\(s\) per core:|^Core\(s\) per socket:|^Socket\(s\):'
echo
echo "CPU MHz (Intel):"
grep MHz /proc/cpuinfo | head -5
echo
echo "# For Graviton processors, use: sudo dmidecode -t processor | grep -E \"Speed|Version\""
echo

echo "--- MEMORY & SWAP INFORMATION ---"
echo "Total RAM:"
free -h | grep Mem
grep MemTotal /proc/meminfo
echo
echo "Swap Space:"
swapon --show
echo
echo "Swappiness setting:"
sysctl -a 2>/dev/null | grep swapp 2>/dev/null
echo

echo "--- MEMORY MANAGEMENT SETTINGS ---"
echo "Dirty background ratio:"
cat /proc/sys/vm/dirty_background_ratio
echo
echo "Dirty ratio:"
cat /proc/sys/vm/dirty_ratio
echo

echo "--- TRANSPARENT HUGE PAGES (THP) ---"
echo "THP Status:"
cat /sys/kernel/mm/transparent_hugepage/enabled
echo

echo "--- HUGE PAGES INFORMATION ---"
echo "Huge Pages Count:"
cat /proc/meminfo | grep "HugePages_Total"
echo
echo "Huge Page Size:"
grep Hugepagesize /proc/meminfo
echo

echo "--- FILE DESCRIPTOR LIMITS ---"
echo "File descriptor limits for daemon user:"
echo "Hard limit:"
sudo runuser -u daemon -- ulimit -Hn 2>/dev/null || echo "Unable to check daemon user limits (user may not exist)"
echo "Soft limit:"
sudo runuser -u daemon -- ulimit -Sn 2>/dev/null || echo "Unable to check daemon user limits (user may not exist)"
echo

echo "========================================="
echo "Report completed at $(date)"
echo "========================================="
