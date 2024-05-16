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

declare namespace forest = "http://marklogic.com/xdmp/status/forest";

declare function local:db-stats($db) {
  let $all-forests := xdmp:database-forests(xdmp:database($db), fn:true())
  let $forests := xdmp:database-forests(xdmp:database($db), fn:false())  
  let $replica-forests := fn:distinct-values($all-forests[fn:not(. = $forests)])

  (: Just use the primary forests so we know how many documents we are really working with :)
  let $forest-counts := xdmp:forest-counts($forests)
  
  (: Get the RAM and disk usage from all forests though so we know how much RAM and disk are actually being used :)
  let $forest-status := xdmp:forest-status($all-forests)
  
  (: Get rid of any in-memory stands because they can throw the RAM per doc calcualtion off :)
  let $stand-ids := $forest-status//forest:stand[forest:memory-size lt forest:disk-size]/forest:stand-id

  let $documents := fn:sum($forest-counts/forest:document-count)
  let $active-fragments := fn:sum($forest-counts//forest:stand-counts[forest:stand-id = $stand-ids]/forest:active-fragment-count)
  let $deleted-fragments := fn:sum($forest-counts//forest:stand-counts[forest:stand-id = $stand-ids]/forest:deleted-fragment-count)
  let $disk-size := fn:sum($forest-status//forest:stand[forest:stand-id = $stand-ids]/forest:disk-size)
  let $memory-size := fn:sum($forest-status//forest:stand[forest:stand-id = $stand-ids]/forest:memory-size)
  return (
    $active-fragments + $deleted-fragments,
    $disk-size,
    $memory-size
  )
};

let $databaseName := "lux-content"

let $labels := (
  "Documents       ",
  "Data size (MB)  ",
  "Memory size (MB)"
)
let $stats-for-database-1 := local:db-stats($databaseName)

return fn:string-join((
  "&#09;&#09;&#09;",
  $databaseName,
  for $i in 1 to 3
  return fn:string-join((
    $labels[$i],
    xs:string($stats-for-database-1[$i])
  ), "&#09;"),
  "",
  "Total documents &#09;" || $stats-for-database-1[1],
  "Total on-disk (MB)&#09;" || $stats-for-database-1[2],
  "Total in-mem (MB)&#09;" || $stats-for-database-1[3],
  "",
  "Paste this into the spreadsheet:",
    for $i in 1 to 3
  return fn:string-join((
    xs:string($stats-for-database-1[$i])
  ), "&#09;")), "&#13;"
)
