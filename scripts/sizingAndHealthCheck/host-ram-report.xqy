(:
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
:)
xquery version "1.0-ml";
declare namespace m = "http://marklogic.com/manage/meters";

(: Lists the total memory used as well as per host :)
(: Be sure to run this against the Meters database :)

(: Get the most recent timestamp for the meters data and use that for reporting :)
let $start-time := cts:element-values(xs:QName("m:period-start-time"), (), ("descending"))[1]

let $hosts-query :=
    cts:and-query((
      cts:collection-query("meters"),
      cts:element-query(xs:QName("m:host-statuses"), cts:true-query()),
      cts:element-range-query(xs:QName("m:period-start-time"), "=", $start-time)
    ))
    
let $statuses :=
  cts:search(
    fn:doc(), 
    $hosts-query
  )/m:host-statuses
  
let $totals := (
  "memory-system-total: " || xs:unsignedLong(fn:sum($statuses//m:memory-system-total)),
  "memory-system-free: " || xs:unsignedLong(fn:sum($statuses//m:memory-system-free))
)

let $per-host := 
  for $status-doc in $statuses
  let $status := $status-doc/m:host-status
  return (
    "host-name: " || $status-doc/m:host-name,
    "cores: " || $status/m:cores,
    "core-threads: " || $status/m:core-threads,
    "memory-system-total: " || $status/m:memory-system-total,
    "memory-system-free: " || $status/m:memory-system-free,
    "memory-system-free-percent: " || (($status/m:memory-system-free div $status/m:memory-system-total) * 100),
    "memory-forest-size: " || $status/m:memory-forest-size,
    "memory-forest-size-percent: " || (($status/m:memory-forest-size div $status/m:memory-system-total) * 100),
    "memory-file-size: " || $status/m:memory-file-size,
    "memory-cache-size: " || $status/m:memory-cache-size,
    "memory-cache-size-percent: " || (($status/m:memory-cache-size div $status/m:memory-system-total) * 100),
    "memory-process-size: " || $status/m:memory-process-size,
    "memory-process-rss: " || $status/m:memory-process-rss,
    "memory-process-anon: " || $status/m:memory-process-anon,
    "memory-process-rss-hwm: " || $status/m:memory-process-rss-hwm,
    "memory-process-swap-size: " || $status/m:memory-process-swap-size,
    "memory-process-huge-pages-size: " || $status/m:memory-process-huge-pages-size,
    "**********************************",
    ()
  )

return (
  $totals,
  "**********************************",
  $per-host
)