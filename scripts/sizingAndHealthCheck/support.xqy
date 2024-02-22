(:
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
:)
declare namespace sv="http://marklogic.com/xdmp/status/server";
declare namespace db="http://marklogic.com/xdmp/database";
declare namespace f="http://marklogic.com/xdmp/status/forest";
declare namespace h="http://marklogic.com/xdmp/hosts";
declare namespace hs="http://marklogic.com/xdmp/status/host";
declare namespace g="http://marklogic.com/xdmp/group";
declare namespace k="http://marklogic.com/xdmp/status/keystore";

declare variable $IDS := map:map();
declare variable $FSTAT := map:map();
declare variable $FCOUNTS :=map:map();
declare variable $HOSTS := map:map();
declare variable $GROUPS := map:map();
declare variable $KEYSTORE := ();
declare variable $HOSTIDS := ();


declare function local:pretty-print ($doc as node()?) as element(pre) {

   <pre>{xdmp:quote(xdmp:tidy( xdmp:quote($doc),
      <options xmlns="xdmp:tidy">
        <indent>auto</indent>
        <input-xml>yes</input-xml>
      </options>)[2])
   }</pre>

} ;


declare function local:servers($dump) {
 
  let $map := map:map()
  let $_ := 
				let $servers := $dump//sv:server-status
				
			  for $server in $servers
                          let $host := map:get($HOSTS, fn:string($server/sv:host-id))/h:host-name
                          let $name := $server/sv:server-name/fn:string(.)
                          let $name := if (fn:empty($name)) then "Task Server" else $name
			  return 
			     map:put($map, $name || $host, 
			     	     element info {
			              element name {$name},
                                      element host {$host/fn:string(.)},
			              element kind {$server/sv:server-kind/fn:string(.)},
			              element database {$server/sv:database},
			              element modules {$server/sv:modules},
			              element rate {$server/sv:request-rate/fn:number(.) },
			              element threads {$server/sv:max-threads/fn:number(.)},
			              element hits {$server/sv:expanded-tree-cache-hits/fn:number(.)},
			              element misses {$server/sv:expanded-tree-cache-misses/fn:number(.)},
			              element hit-rate {$server/sv:expanded-tree-cache-hit-rate/fn:number(.)},
			              element miss-rate {$server/sv:expanded-tree-cache-miss-rate/fn:number(.)},
                                      ()

			     	     }
			         
			     	)
	return
  element table{
		
	  attribute class {"box-table-a"},
      element tr {
           element th { "Name"},
           element th { "Host"},
           element th { "Type"},
           element th { "DB"},
           element th { "Modules"},
           element th { "Rate"},
           element th { "Threads"},
           element th { "Hits"},
           element th { "Misses"},
           element th { "Miss-Rate"}
  
      },
	  for $server in map:keys($map)
	  let $info := map:get($map, $server)
	  order by $server
	  return 
	  element tr {
	       element td { $info/name/fn:string(.)},
	       element td { $info/host/fn:string(.)},
	       element td { $info/kind/fn:string(.)},
	       element td { map:get($IDS,$info/database)},
	       element td { map:get($IDS,$info/modules)},
	       element td { $info/rate/local:format(.)},
	       element td { $info/threads/local:format(.)},
	       element td { $info/hits/local:format(.)},
	       element td { $info/misses/local:format(.)},
	       element td { $info/hit-rate/local:format(.)},
	       element td { $info/miss-rate/local:format(.)}
	  }
	}
};

declare function local:hosts ($dump) {
	let $map := map:map()
	let $_ := for $s in $dump//hs:host-status return  map:put ($map, $s/hs:host-name, $s)
	let $forests:= map:map()
	let $_ := for $f in $dump/f:forest-status return  map:put ($forests, $f/f:host-id/fn:string(.), (map:get($forests, $f/f:host-id/fn:string(.)), $f))
	return
	element table {
		attribute class {"box-table-a"},
		element tr {
    
    element td { "Host #"},
    element td { "Name"},
    element td { "Last Startup"},
    element td { "Group"},
    element td { "Forests"},
    element td { "Forest Size"},
    element td { "Mem Size"},
    element td { "Version"},
    element td { "Arch"},
    element td { "CPUs"},
    element td { "Cores"},
    element td { "CPU Usage(User,System,IOWait)"},
    element td { "Memory"},
    element td { "Disk"},
    element td { "Process Size"},
    element td { "RSS Size"},
    element td { "RSS HWM"},
    element td { "Anon Size"},
    element td { "Swap Size"},
    element td { "Fragments"},
    element td { "Unclosed Stands"}
    },
		for $hostid at $i in $HOSTIDS
		let $host := map:get($HOSTS, $hostid)
		let $status := map:get($map ,$host/h:host-name)
                let $group := fn:data(map:get($GROUPS, $host/h:group/fn:string(.))/g:group-name)
                let $disk := (($status//hs:data-dir-space ) div 1000)
		return 
		element tr {
			element td {"H" || $i},
			element td {fn:data($host/h:host-name)},
			element td {fn:data($status/hs:last-startup)},
			element td {$group},
			element td {(fn:count(map:get($forests,$hostid)) ) },
			

			element td {local:format(fn:sum(map:get($forests,$hostid)//f:disk-size) div 1024) },
			element td {local:format(fn:sum(map:get($forests,$hostid)//f:memory-size) div 1024) },
       
	
			element td {fn:data($status/hs:version)},
			element td {fn:data($status/hs:architecture)},
			element td {fn:data($status/hs:cpus)},
			element td {fn:data($status/hs:cores)},
			element td {fn:string-join(($status/hs:total-cpu-stat-user, $status/hs:total-cpu-stat-system, $status/hs:total-cpu-stat-iowait) ! xs:string(.), ", ")},
			element td {fn:data($status/hs:memory-size) div 1000},
			element td {local:format($disk) },
			element td {local:format(fn:data($status/hs:memory-process-size) div 1024)}	,
			element td {local:format(fn:data($status/hs:memory-process-rss) div 1024)}	,
			element td {local:format(fn:data($status/hs:memory-process-rss-hwm) div 1024)}	,
			element td {local:format(fn:data($status/hs:memory-process-anon) div 1024)}	,
			element td {local:format(fn:data($status/hs:memory-process-swap-size) div 1024)}	,

      element td { fn:sum(for $f in  map:get($forests,$hostid)/f:forest-id
      	                  let $fc := map:get($FCOUNTS, fn:string($f))
      	                  return fn:sum($fc//f:active-fragment-count)) div 1000000},
      element td { fn:sum(for $f in  map:get($forests,$hostid)/f:forest-id
      	                  let $fc := map:get($FSTAT, fn:string($f))
      	                  return fn:count($fc//f:unclosed-stand)) }
		}
            
	}
};

declare function local:groups ($dump) {
	
	
	element table {
		attribute class {"box-table-a"},
		element tr {
    
    
    element td { "Group"},
    element td { "ETC"},
    element td { "LC"},
    element td { "CTC"},
    element td { "Num Hosts"}
    },
    for $g in map:keys($GROUPS)
    let $group := map:get($GROUPS, $g)
    let $num := 
		   fn:count(for $hostid at $i in $HOSTIDS
		   let $host := map:get($HOSTS, $hostid)
		   where fn:string($host/h:group) = $g 
		   return $hostid)
		
	
		return 
		element tr {
			element td {$group/g:group-name/fn:string(.)},
			element td {$group/g:expanded-tree-cache-size/fn:string(.)  || "/" || $group/g:expanded-tree-cache-partitions/fn:string(.)},
			element td {$group/g:list-cache-size/fn:string(.)  || "/" || $group/g:list-cache-partitions/fn:string(.)},
			element td {$group/g:compressed-tree-cache-size/fn:string(.)  || "/" || $group/g:compressed-tree-cache-partitions/fn:string(.)},
			element td {$num}
		}
	}
};

declare function local:format($number) {
  let $d := fn:data($number)
  let $d := if ($d castable as xs:float) then $d else 0
  return
  fn:format-number($d,"#,##0.00")
};


declare function local:ratio($hits, $misses) {
  let $ratios := 
  for $h at $i in $hits
  let $m := $misses[$i]
  where $h > 1
  order by $h descending
  return xs:float($h div ($h + $m)) * 100
  return 
  if ($ratios) then local:format( fn:avg($ratios)) else 0

};
declare function local:ratio-old($hits, $misses) {
  if (fn:sum($hits) gt 0) 
  then local:format(100 * fn:sum($hits) div 
                     (fn:sum($hits) + fn:sum($misses)))
  else 0
};



declare function local:forest-layout($dump) {
element table{
  attribute class {"box-table-a"},
  element tr {
    
    element td { "Database/Forests"},

    for $h at $j in map:keys($HOSTS) return element td { attribute style { "width: 2px"}, " " }
  },
  let $dbs := ($dump//db:databases)[1]/db:database
  for $db in $dbs
  let $db-name := $db/(db:database-name)/fn:string(.)
  order by $db/db:database-name
  return 
  (    
  	   element tr {
  	   	  
  	   	  element th {  attribute colspan {"10"}, $db-name  }
  	   	 
  	   },
       for $f at $j in $db/db:forests/db:forest-id/fn:string(.)
       let $fs := map:get($FSTAT, $f)
       
       let $ms := map:get($FSTAT, fn:string($fs//f:current-master-forest))
       let $replicas := $fs//f:replica-forest/fn:string(.)
       let $rs := for $r  in $replicas return map:get($FSTAT, $r)
       let $forest-host := map:get($HOSTS, fn:string($fs/f:host-id))
       let $group := map:get($GROUPS, fn:string($forest-host/h:group))
       let $all_open := every $s in ($fs/f:state, $rs/f:state) satisfies $s = ("open", "sync replicating")
       return 
        element tr {
          
          element td { attribute style {"padding-left:20px"}, fn:string($fs/f:forest-name)},
          element td { 
                if ($all_open) then () else attribute style { "background: #f8dc88;" } ,
                fn:string-join(($fs/f:state, $rs/f:state), ",")
          },
          for $h at $j in $HOSTIDS
          let $host := map:get($HOSTS, $h)
          let $palette :=  ( "#9FC2D6;", "#B8D0DE;", "#B8D0DE;", "#B8D0DE;", "#B8D0DE;")
          return element td { attribute title {$host/h:host-name/fn:string(.)},
                              let $background := ("background:" || fn:subsequence($palette, ($j mod 5) + 1, 1) )
                              let $char := if ($fs/f:numa-node = 1) then "&#x25a0;" else "&#x25B6;"
                              return 
          	              if ($h = fn:string($fs/f:host-id)) 
                              then (attribute style {$background ||  "color:white; width: 2px; padding: 1px; "}, $char)
                              else if ($h = (for $r in $rs return fn:string($r/f:host-id)))
                                   then if ($f ne fn:string($fs//f:current-master-forest)) 
                                   then (attribute style { $background || "color:red; width: 2px; padding: 1px; "}, $char) 
                                   else (attribute style { $background || "color:orange; width: 2px; padding: 1px;"}, $char)
                              else attribute style { $background ||  "width: 2px;padding: 0px;"}
                             }
        }
 )
}

};

declare function local:databases($dump) {
element table{
  attribute class {"box-table-a"},
  
  let $dbs := ($dump//db:databases)[1]/db:database
  for $db in $dbs
  let $db-name := $db/(db:database-name)/fn:string(.)
  let $locking := $db/(db:locking)/fn:string(.)
  let $encr := ($db/(db:data-encryption)/fn:string(.) || "(" || fn:string($KEYSTORE/k:data-encryption) || ")")
  let $indexes := fn:string-join($db/*[fn:string(.) = "true"]/fn:local-name(.), ",")
  let $range-indexes := fn:count($db//(*:range-element-index|*:range-element-attribute-index)/*:localname/fn:tokenize(fn:string(.), " ")) 
  let $paths := fn:count($db//*:range-path-index/*:path-expression/fn:tokenize(fn:string(.), " ")) 
  let $fragments := 0
  let $dfragments := 0
  let $documents := 0
  let $size := 0
  let $memory := 0
  let $stands := 0
  let $colspan := "18"
  let $imstand := fn:sum(($db//*:in-memory-list-size ,$db//*:in-memory-tree-size   , $db//*:in-memory-range-index-size , $db//*:in-memory-reverse-index-size, $db//*:in-memory-triple-index-size))

  let $blackouts :=  fn:count($db//*:merge-blackout)
  order by $db/db:database-name
  return 
  (    

  	   element tr {
  	   	  element th {  attribute colspan {$colspan}, $db-name }
  	   },
  	   element tr {
  	   	  element td {  attribute colspan {$colspan}, "Locking : " || $locking || " Encrypted: " || $encr  }
           },
  	   element tr {
  	   	  element td {  attribute colspan {$colspan}, $indexes || " range-indexes=" ||$range-indexes || " range-paths=" ||$paths  }
  	   },
           if ($blackouts gt 0) 
           then 
  	   element tr {
  	   	  element td {  attribute style { "background:yellow"},  attribute colspan {"10"}, "Merge blackouts: ", local:pretty-print($db//*:merge-blackouts)  }
           }
           else (),
  	   element tr {
    
    element td { "Forests"},
    element td { "Host"},
    element td { "State"},
    element td { "Numa"},
    element td { "Stands"},
    element td { "Unclosed Stands"},
    element td { "Active Fr"},
    element td { "Deleted Fr"},
    element td { "Documents"},
    element td { "DB Size"},
    element td { "Mem Size "},
    element td { "InMem Stands"},
    element td { "LC Ratio"},
    element td { "LC Hit/Miss Rate"},
    element td { "CTC Hit/Miss Rate"},
    element td { "CTC Ratio"},
    element td { "Disk Space"},
    element td { "Deadlocks"}

  },
       for $f at $j in $db/db:forests/db:forest-id/fn:string(.)
       let $fs := map:get($FSTAT, $f)
       let $fc := map:get($FCOUNTS, fn:string($fs//f:current-master-forest))
       let $ms := map:get($FSTAT, fn:string($fs//f:current-master-forest))
       let $replicas := $fs//f:replica-forest/fn:string(.)
       let $rs := for $r  in $replicas return map:get($FSTAT, $r)
       let $forest-host := map:get($HOSTS, fn:string($fs/f:host-id))
       let $group := map:get($GROUPS, fn:string($forest-host/h:group))
       let $_ := xdmp:set($fragments, $fragments +fn:sum($fc//f:active-fragment-count) )
       let $_ := xdmp:set($dfragments, $dfragments +fn:sum($fc//f:deleted-fragment-count) )
       let $_ := xdmp:set($size, $size + fn:sum($fs//f:disk-size) )
       let $_ := xdmp:set($memory, $memory + fn:sum($fs//f:memory-size) )
       let $_ := xdmp:set($documents, $documents +fn:sum($fc//f:document-count) )
       let $_ := xdmp:set($stands, $stands +fn:count($fs//f:stand) )
       order by $group/g:group-name
       return 
        element tr {
          
          element td { attribute style {"padding-left:20px"}, fn:string($fs/f:forest-name)},
          
          element td { fn:string($forest-host/h:host-name), "-" , fn:data(map:get($GROUPS, $forest-host/h:group/fn:string(.))/g:group-name)},
          element td { fn:string($fs/f:state), ": ", fn:string($fs/f:state-detail)},
          element td { fn:string($fs//f:numa-node)},
          element td { fn:count($fs//f:stand)},
          element td { fn:count($fs//f:unclosed-stand)},
          element td { local:format(fn:sum($fc//f:active-fragment-count)  div 1000000)},
          element td { local:format(fn:sum($fc//f:deleted-fragment-count) div 1000000)},
          element td { local:format(fn:sum($fc//f:document-count) div 1000000)},
          element td { local:format(fn:sum($fs//f:disk-size) div 1024)},
          element td { local:format(fn:sum($fs//f:memory-size) div  1024)},
          element td { fn:count(for $s in $fs//f:stand where $s/f:memory-size gt $s/f:disk-size and $s/f:memory-size gt $imstand return $s/f:memory-size)},
          element td { local:ratio($ms//f:list-cache-hits,$ms//f:list-cache-misses)},
          element td { local:format(fn:sum($ms//f:list-cache-hit-rate)), "/",  local:format(fn:sum($ms//f:list-cache-miss-rate))},
          element td { local:format(fn:sum($ms//f:compressed-tree-cache-hit-rate)), "/",  local:format(fn:sum($ms//f:compressed-tree-cache-miss-rate))},
         
          element td { local:ratio($ms//f:compressed-tree-cache-hits,$ms//f:compressed-tree-cache-misses)},
          element td { local:format($ms//f:device-space div 1024)},
          element td { fn:sum($ms//f:deadlock-count)}
          
        },
         element tr { attribute class {"box-table-totals"},
          
          element td { attribute style {"padding-left:20px"}, "Total"},
          
          element td { fn:count($db/db:forests/db:forest-id)},
          element td { " "},
          element td { " "},
          element td { $stands},
          element td { " "},
          element td { local:format($fragments  div 1000000)},
					element td { local:format($dfragments  div 1000000)},
          element td { local:format($documents  div 1000000)},
					element td { local:format($size  div 1024)},
					element td { local:format($memory  div 1024)},
          element td {  attribute colspan {"7"}, " "}
          
          
        },
  	element tr {
  	   	  element td {  attribute colspan {$colspan}, "In Memory Stand (MB)= " || $imstand || " - Avg fragment size (KB)=" || (if ($fragments gt 0) then local:format(($size  * 1024) div  ($fragments + $dfragments) ) else "" )    }
  	}
 )
}

};

declare function local:tocsv ($table)
{ 
   for $row in $table/tr 
   return 
   fn:string-join(
    fn:string-join( $row/(td|th)/fn:normalize-space(.), ","),
    "&#x0a;")
      	
};

declare function local:head()
{

<head>
	<style media="screen" type="text/css">
			<![CDATA[
			.box-table-a
			{
			    font-family: "Lucida Sans Unicode", "Lucida Grande", Sans-Serif;
			    font-size: 10px;
			  
			   
			    text-align: left;
			    border-collapse: collapse;
			}
			.box-table-a th
			{
			    font-size: 12px;
			    font-weight: bold;
			    padding: 2px;
			    background: #ffffff;
			   
			    color: #039;
			}
			.box-table-a td
			{
			    padding: 4px;
			    background: #e8edff; 
			    border-bottom: 1px solid #fff;
			    color: #669;
			    border-top: 1px solid transparent;
			}
		
			.box-table-a tr:hover td
			{
			    background: #d1dbfe;
			    color: #339;
			}
                        .box-table-totals td
                        {
                            padding: 4px;
                            background: #d0dafd;
                            border-bottom: 1px solid #fff;
                            border-top: 1px solid transparent;
                        }




			]]>
	</style>
</head>
};

xdmp:set-request-time-limit(3600),
xdmp:set-response-content-type("text/html"),


let $file := xdmp:get-request-field("filename")
let $dump := xdmp:unquote("<a>" || xdmp:document-get($file) || "</a>")/*
(:
let $dump := xdmp:unquote("<a>" || xdmp:document-get("/Users/sravotto/Downloads/support.txt") || "</a>")/*
let $dump := xdmp:unquote("<a>" || xdmp:document-get("/Users/sravotto/a.txt") || "</a>")/*
:)
let $_ :=
 (
   for $db in $dump/db:databases/db:database return map:put($IDS, fn:string($db/db:database-id), $db/db:database-name),
   for $f in $dump/f:forest-counts return map:put($FCOUNTS, fn:string($f/f:forest-id), $f),
   for $f in $dump/f:forest-status return map:put($FSTAT, fn:string($f/f:forest-id), $f),
   for $h in $dump/h:hosts/h:host return map:put($HOSTS, fn:string($h/h:host-id), $h),
   for $g in $dump/g:groups/g:group return map:put($GROUPS, fn:string($g/g:group-id), $g),
   xdmp:set($HOSTIDS, for $h in map:keys($HOSTS) order by map:get($HOSTS, $h)/h:host-name return $h),
   xdmp:set($KEYSTORE, ($dump/k:keystore-status)[1]) 
 )
return

 element html {
 	local:head(),
 	element h1 {"Groups"},
  local:groups($dump),
  element h1 {"Hosts"},
  local:hosts($dump),
  
  element h1 {"Servers"},
  local:servers($dump),
  
  element h1 {"Databases"},
  local:databases($dump),
  element h1 {"Forest Layout"},
  element div {"Total forests = " || fn:count(map:keys($FSTAT))},
  element div {"Total master forests = " || 
         fn:count(fn:distinct-values(for $key in map:keys($FSTAT) 
                                    let $fs := map:get($FSTAT, $key) 
                                    return fn:string($fs//f:current-master-forest)))},
  local:forest-layout($dump)
  
 }
(:
   local:tocsv(local:hosts($dump)) 

:)


