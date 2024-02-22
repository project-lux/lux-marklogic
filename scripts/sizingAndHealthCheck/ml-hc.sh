#!/bin/bash

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

# NOTICE: This script needs to be run as a user with sudo privileges. Be sure
# to review in detail to be sure it adhears to you IT security policies for
# the commands it runs and the data it collects.


OUT="ml-hc-${HOSTNAME}-$(date +%F-%H%M%S).xml"
echo "Health check output: $OUT"

# Open STDOUT as $OUTE file for read and write.
exec 1<>$OUT

# Run this as a user with root privileges

section () {
    NAME=$1
    shift
    COMMAND=$@
    echo "  <section>"
    echo "    <name>${NAME}</name>"
    echo "    <command>${COMMAND}</command>"
    echo "    <output><![CDATA["
    "$@" 2>&1
    echo "    ]]></output>"
    echo "  </section>"
}

echo "<health-check xmlns=\"http://marklogic.com/health-check\">"
echo "  <host>${HOSTNAME}</host>"
echo "  <date>$(date +%FT%T)</date>"

section "release" cat /etc/redhat-release

section "uname" uname -a

section "cpuinfo" cat /proc/cpuinfo

section "meminfo" cat /proc/meminfo

section "transparent huge pages" cat /sys/kernel/mm/transparent_hugepage/enabled

section "swappiness" cat /proc/sys/vm/swappiness

section "ifconfig" ifconfig

section "df" df -m

section "mount" mount

for DEV in /sys/block/*; do
    section "Device Scheduler: ${DEV}" cat $DEV/queue/scheduler
done

section "logical volumes" lvdisplay -m

section "storage devices" ls -lL /dev/mapper /dev/sd* /dev/vd* /dev/xvd*

section "MD devices" cat /proc/mdstat

section "forest mounts" grep 'Mounted .* locally' /var/opt/MarkLogic/Logs/ErrorLog*.txt

section "dmesg" dmesg

echo "</health-check>"
