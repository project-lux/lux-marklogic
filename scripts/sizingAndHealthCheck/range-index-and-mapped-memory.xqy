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

(: 
 : This has to be run from QConsole connected to a D-node. 
 : It will report memory mapped files for only forests attached to the host it is run against.
 :
 : Specify the DB you want it to run against with the $db-name variable below.
 : 
 : If you just want the name map, set $MAP-NAMES-ONLY := fn:true()
 :)
 
import module namespace admin = "http://marklogic.com/xdmp/admin" at "/MarkLogic/admin.xqy";

declare namespace idxpath = "http://marklogic.com/indexpath";
declare namespace d = "http://marklogic.com/xdmp/database";

declare variable $IS-LINUX := fn:true();
declare variable $MAP-NAMES-ONLY := fn:false();
declare variable $db-name := "lux-content";
declare variable $host := xdmp:host();

declare function local:qname-key($uri, $nam) {
  xdmp:add64(
    xdmp:mul64(
      xdmp:add64(
        xdmp:mul64(xdmp:hash64($uri),5),
        xdmp:hash64($nam)),
      5),
   xdmp:hash64("qname()"))
};

declare function local:attr-key($euri, $enam, $auri, $anam) {
  xdmp:add64(
    xdmp:mul64(
      xdmp:add64(
        xdmp:mul64(local:qname-key($euri,$enam),5),
        xdmp:hash64("/@")),
      5),
    local:qname-key($auri,$anam))
};

declare function local:element-range-index($uri, $nam) {
  xdmp:integer-to-hex(local:qname-key($uri,$nam))
};

declare function local:path-range-index-key($path, $path-namespaces) {
  let $nsbindings := $path-namespaces/(d:prefix, d:namespace-uri)/fn:string(.)
  let $keys := xdmp:with-namespaces($nsbindings, cts:index-path-keys($path))
  return xdmp:integer-to-hex($keys/idxpath:path-expression-key)
};

declare function local:element-attribute-range-index($euri, $enam, $auri, $anam) {
  xdmp:integer-to-hex(local:attr-key($euri, $enam, $auri, $anam))
};

declare function local:get-element-range-index-keys($map as map:map, $db-name as xs:string) {
  let $ranges := admin:database-get-range-element-indexes(admin:get-configuration(), xdmp:database($db-name))
  for $range in $ranges
  let $uri := fn:string($range/d:namespace-uri)
  let $coll := fn:string($range/d:collation)
  let $ckey :=
    if (
      $coll eq "http://marklogic.com/collation/codepoint"
      or $range/d:scalar-type ne "string"
    )
    then "-"
    else fn:concat("-", xdmp:integer-to-hex(xdmp:hash64($coll)), "@602+") (: 602 is the collation ICU version and it might change for different versions of MarkLogic http://userguide.icu-project.org/#/Collate_Concepts.html :)
  for $name in fn:tokenize(fn:string($range/d:localname), " ")
  let $nam := fn:string($name)
  let $key := local:element-range-index($uri, $nam)
  for $pos in (
    "",
    if (data($range/d:range-value-positions)) then "=" else ()
  )
  let $fkey := fn:concat($key, $ckey, $range/d:scalar-type, $pos)
  let $uri := if($uri) then $uri else "empty"
  return map:put($map, $fkey, fn:concat($uri, ":", $nam))
};

declare function local:get-element-attribute-range-index-keys($map as map:map, $db-name as xs:string) {
  let $ranges := admin:database-get-range-element-attribute-indexes(admin:get-configuration(), xdmp:database($db-name))
  for $range in $ranges
  let $euri := fn:string($range/d:parent-namespace-uri)
  let $auri := fn:string($range/d:namespace-uri)
  let $coll := fn:string($range/d:collation)
  let $ckey :=
    if (
      $coll eq "http://marklogic.com/collation/codepoint"
      or $range/d:scalar-type ne "string"
    )
    then "-"
    else fn:concat("-", xdmp:integer-to-hex(xdmp:hash64($coll)), "@602+")
  for $ename in fn:tokenize(fn:string($range/d:parent-localname), " ")
  let $enam := fn:string($ename)
  for $aname in fn:tokenize(fn:string($range/d:localname), " ")
  let $anam := fn:string($aname)
  for $pos in (
    "",
    if (data($range/d:range-value-positions)) then "=" else ()
  )
  let $key := local:element-attribute-range-index($euri, $enam, $auri, $anam)
  let $fkey := fn:concat($key, $ckey, $range/d:scalar-type, $pos)
  return map:put($map, $fkey, fn:concat($euri, ":", $enam, "@", $auri, ":", $anam))
};

declare function local:get-path-range-index-keys($map as map:map, $db-name as xs:string) {
  let $ranges := admin:database-get-range-path-indexes(admin:get-configuration(), xdmp:database($db-name))
  let $path-namespaces := admin:database-get-path-namespaces(admin:get-configuration(), xdmp:database($db-name))
  for $range in $ranges
  let $path := fn:string($range/d:path-expression)
  let $coll := fn:string($range/d:collation)
  let $ckey :=
    if (
      $coll eq "http://marklogic.com/collation/codepoint"
      or $range/d:scalar-type ne "string"
    )
    then "-"
    else fn:concat("-", xdmp:integer-to-hex(xdmp:hash64($coll)), "@602+")
  let $key := local:path-range-index-key($path, $path-namespaces)
  for $pos in (
    "",
    if (data($range/d:range-value-positions)) then "=" else ()
  )
  let $fkey := fn:concat($key, $ckey, $range/d:scalar-type, $pos)
  return map:put($map, $fkey, "path:" || $path)
};

declare function local:get-field-range-index-keys($map as map:map, $db-name as xs:string)
{
  let $ranges := admin:database-get-range-field-indexes(admin:get-configuration(), xdmp:database($db-name))
  for $range in $ranges
  let $uri := "http://marklogic.com/fields"
  let $coll := fn:string($range/d:collation)
  let $ckey :=
    if ($coll eq "http://marklogic.com/collation/codepoint" or
        $range/d:scalar-type ne "string")
    then "-"
    else
      fn:concat("-", xdmp:integer-to-hex(xdmp:hash64($coll)), "@602+")
  for $name in fn:tokenize(fn:string($range/d:field-name), " ")
  let $key := local:element-range-index($uri, $name)
  let $fkey := fn:concat($key, $ckey, $range/d:scalar-type)
  return map:put($map, $fkey, "field:" || $name)
};


declare function local:default-data-directory() as xs:string {
  if($IS-LINUX) then
    "/var/opt/MarkLogic"
  else
    "C:\Program Files\MarkLogic\Data"
};

declare function local:get-slash(){
  if($IS-LINUX) then "/" else "\"
};

declare function local:get-forest-data-directory($forest-id) as xs:string {
  let $dir := admin:forest-get-data-directory(admin:get-configuration(),$forest-id)
  let $dir := if($dir) then $dir else local:default-data-directory()
  let $dir := if(fn:ends-with($dir,local:get-slash())) then $dir else fn:concat($dir,local:get-slash())
  return
  fn:concat($dir,"Forests",local:get-slash(),xdmp:forest-name($forest-id))  
};

declare function local:get-stand-directories($dir as xs:string) {
  for $entry in xdmp:filesystem-directory($dir)//dir:entry
  return
  if(($entry/dir:type = "directory") and fn:not($entry/dir:filename/text() = ("Journals","Large"))) then
    $entry//dir:pathname/text()
  else()
};

declare function local:add-to-memory-map($map as map:map,$entry as element(dir:entry)) {
  let $filename := fn:replace($entry/dir:filename/text(),"-$","")
  let $null := if(map:get($map,$filename)) then () else map:put($map,$filename,0)
  return
  map:put($map,$filename,map:get($map,$filename) + xs:long($entry/dir:content-length/text()))
};

declare function local:format-number($number){
  $number 
(:
  if($number > 1024 * 1024 * 1024) then
    fn:concat(xs:string(xs:int($number div (1024 * 1024)) div 1000),"G")
  else if($number > 1024 * 1024) then
    fn:concat(xs:string(xs:int($number div 1024) div 1000),"M")  
  else if($number > 1024) then
    fn:concat(xs:string($number div 1000),"K")  
  else
    xs:string($number)
:)
};

let $map := map:map()
let $name-map := map:map()
let $_ := (
  local:get-element-range-index-keys($name-map, $db-name),
  local:get-element-attribute-range-index-keys($name-map, $db-name),
  local:get-path-range-index-keys($name-map, $db-name),
  local:get-field-range-index-keys($name-map, $db-name) 
)

return
  if ($MAP-NAMES-ONLY) then
    $name-map
  else
    let $_ :=
      for $forest in admin:database-get-attached-forests(admin:get-configuration(),xdmp:database($db-name))
      where xdmp:forest-host($forest) = $host
      return
        for $dir in local:get-stand-directories(local:get-forest-data-directory($forest))
        return
          for $entry in xdmp:filesystem-directory($dir)//dir:entry
          return
            local:add-to-memory-map($map, $entry)

    return (  
      "Range Index + Lexicons",
      "======================",
      for $key in map:keys($map)
      let $range-index := map:get($name-map,$key)
      let $range-index := if(fn:lower-case($key) = "4c8c228348a3b60d-string") then "URI Lexicon" else $range-index
      let $range-index := if(fn:lower-case($key) = "702c7a5fff541f5e-string") then "Collection Lexicon" else $range-index
      let $range-index := if($range-index) then $range-index else "Mapping not known"
      where fn:not(fn:matches($key, "^[^\d]*$"))
      order by map:get($map, $key) descending
      return
        fn:concat($key, ",", $range-index, ",", local:format-number(map:get($map, $key))),
      "",
      "Memory Mapped, but not Range Index",
      "==================================",
      for $key in map:keys($map)
      where (fn:matches($key, "^[^\d]*$") and fn:not($key = ("ListData", "TreeData")))
      order by map:get($map, $key) descending
      return
        fn:concat($key, ",", local:format-number(map:get($map, $key)))  
    )