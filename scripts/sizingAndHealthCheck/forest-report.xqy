(:
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
:)

(: Create a CSV-formatted report of forest sizing information. This report can take a couple minutes to run.
   This report's input is the output of the "Statuses of DBs" query; a copy of that query is herein. :)
xquery version "1.0-ml";

declare namespace ds = "http://marklogic.com/xdmp/status/database";
declare namespace fs = "http://marklogic.com/xdmp/status/forest";
import module namespace admin = "http://marklogic.com/xdmp/admin" 
     at "/MarkLogic/admin.xqy";

(: The report's input is the output of the "Statuses of DBs" query. :)
let $input := <databases>
{
for $db-id in xdmp:databases() order by $db-id return 
let $db-name := xdmp:database-name($db-id)
let $forest-ids := xdmp:database-forests($db-id)
let $merging-forests-ids := xdmp:merging()
let $config := admin:get-configuration()
let $forest-status-all := for $forest-id in $forest-ids 
   return xdmp:forest-status( $forest-id )
let $forest-counts-all := for $forest-id in $forest-ids 
   return xdmp:forest-counts( $forest-id )
let $db-size-mb := fn:sum(
  for $forest-status in $forest-status-all
    for $size in $forest-status//fs:stand/fs:disk-size
      return xs:integer($size/text())
)
let $document-count := fn:sum(
  for $forest-count in $forest-counts-all
    for $cnt in $forest-count//fs:document-count
      return xs:integer($cnt/text())
)
let $directory-count := fn:sum(
  for $forest-count in $forest-counts-all
    for $cnt in $forest-count//fs:directory-count
      return xs:integer($cnt/text())
)
let $active-fragment-count := fn:sum(
  for $forest-count in $forest-counts-all
    for $cnt in $forest-count//fs:stand-counts/fs:active-fragment-count
      return xs:integer($cnt/text())
)
let $nascent-fragment-count := fn:sum(
  for $forest-count in $forest-counts-all
    for $cnt in $forest-count//fs:stand-counts/fs:nascent-fragment-count
      return xs:integer($cnt/text())
)
let $deleted-fragment-count := fn:sum(
  for $forest-count in $forest-counts-all
    for $cnt in $forest-count//fs:stand-counts/fs:deleted-fragment-count
      return xs:integer($cnt/text())
)

return
   <database xmlns="http://marklogic.com/xdmp/status/database">
       <database-id>{ $db-id }</database-id>
       <database-name>{ $db-name }</database-name>
       <database-size-gb>{ $db-size-mb div 1024 }</database-size-gb>
       <document-count>{ $document-count }</document-count>
       <directory-count>{ $directory-count }</directory-count>
       <active-fragment-count>{ $active-fragment-count }</active-fragment-count>
       <nascent-fragment-count>{ $nascent-fragment-count }</nascent-fragment-count>
       <deleted-fragment-count>{ $deleted-fragment-count }</deleted-fragment-count>
       <database-enabled>{ admin:database-get-enabled($config, $db-id) }</database-enabled>
       <merge-timestamp>{ admin:database-get-merge-timestamp($config, $db-id) }</merge-timestamp>
      {
         for $forest-id in $forest-ids
            let $forest-name := xdmp:forest-name( $forest-id )
            return
               <forest xmlns="http://marklogic.com/xdmp/status/forest">
                  { xdmp:forest-status( $forest-id ) }
                  { xdmp:forest-counts( $forest-id ) }
               </forest>
      }
   </database>
}
</databases>

(: Time to create the report. :)
let $columns := fn:string-join(("Database", "Forest", "Host ID", "Data Dir", "Device Space (MB)", "Forest Size (MB)", "Replicated (MB)", "Forest Reserve (MB)", "Large Data (MB)", "Journals (MB)", "Doc Count"), ",")
let $rows := for $forest in $input/ds:database/fs:forest
let $forest-status := $forest/fs:forest-status
let $database-name := $forest/../ds:database-name
let $forest-size-mb := fn:sum($forest-status/fs:stands/fs:stand/fs:disk-size/data())
(: The following four sizes are to include the primary and replicated amounts :)
let $replication-factor := fn:count($forest-status/fs:replica-forests/fs:replica-forest)
let $replicated-mb := $forest-size-mb * $replication-factor
let $forest-reserve-mb := $forest-status/fs:forest-reserve * ($replication-factor + 1)
let $large-data-mb := $forest-status/fs:large-data-size * ($replication-factor + 1)
let $journals-mb := $forest-status/fs:journals-size * ($replication-factor + 1)

order by $database-name
return fn:string-join((
  fn:string($database-name),
  fn:string($forest-status/fs:forest-name),
  fn:string($forest-status/fs:host-id),
  fn:string($forest-status/fs:data-dir),
  fn:string($forest-status/fs:device-space),
  fn:string($forest-size-mb),
  fn:string($replicated-mb),
  fn:string($forest-reserve-mb),
  fn:string($large-data-mb),
  fn:string($journals-mb),
  fn:string($forest/fs:forest-counts/fs:document-count)
), ",")

return ($columns, $rows)