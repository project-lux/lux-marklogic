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

(: Lists the in-memory sizes for all forests as well as per database :)
(: Be sure to run this against the Meters database :)

(: Get the most recent timestamp for the meters data and use that for reporting :)
let $start-time := cts:element-values(xs:QName("m:period-start-time"), (), ("descending"))[1]

let $query :=
    cts:and-query((
      cts:collection-query("meters"),
      cts:element-query(xs:QName("m:database-statuses"), cts:true-query()),
      cts:element-range-query(xs:QName("m:period-start-time"), "=", $start-time)
    ))
    
let $statuses :=
  cts:search(
    fn:doc(), 
    $query
  )/m:database-statuses
  
let $totals := (
  "total-primary-memory-size: " || xs:unsignedLong(fn:sum($statuses/m:database-status/m:master-aggregate/m:memory-size)),
  "total-replica-memory-size: " || xs:unsignedLong(fn:sum($statuses/m:database-status/m:replica-aggregate/m:memory-size)),
  "total-primary-data-size: " || xs:unsignedLong(fn:sum($statuses/m:database-status/m:master-aggregate/m:data-size)),
  "total-replica-data-size: " || xs:unsignedLong(fn:sum($statuses/m:database-status/m:replica-aggregate/m:data-size)),
  "active-fragment-count: " || xs:unsignedLong(fn:sum($statuses/m:database-status/m:master-aggregate/m:active-fragment-count)),
  "deleted-fragment-count: " || xs:unsignedLong(fn:sum($statuses/m:database-status/m:master-aggregate/m:deleted-fragment-count)),
  "total-fragment-count: " || xs:unsignedLong(fn:sum($statuses/m:database-status/m:master-aggregate/(m:active-fragment-count|m:deleted-fragment-count)))
)

let $databases := fn:distinct-values($statuses/m:database-status/m:database-name)

let $per-db :=
  for $database-name in $databases
  let $database-statuses := $statuses/m:database-status[m:database-name = $database-name]
  let $data-size := xs:unsignedLong(fn:sum($database-statuses/m:master-aggregate/m:data-size))
  order by $data-size descending
  return (
    "database: " || $database-name,
    "forests: " || fn:count(fn:distinct-values($database-statuses/m:forests-ids/m:forest-id)),
    "data-size: " || $data-size,
    "primary-memory-size: " || xs:unsignedLong(fn:sum($database-statuses/m:master-aggregate/m:memory-size)),
    "replica-memory-size: " || xs:unsignedLong(fn:sum($database-statuses/m:replica-aggregate/m:memory-size)),
    "active-fragment-count: " || xs:unsignedLong(fn:sum($database-statuses/m:master-aggregate/m:active-fragment-count)),
    "deleted-fragment-count: " || xs:unsignedLong(fn:sum($database-statuses/m:master-aggregate/m:deleted-fragment-count)),
    "***********************************",
    ()
  )
  
return (
  $totals,
  "***********************************",
  $per-db
)