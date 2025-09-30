(:
 : Exports raw data from the meters database for the specified period.
 : Support prefers this export over the XLS from the monitoring console.
 : On Windows, you may need the likes of PeaZip to open the output .zip file.
 : Source: https://community.progress.com/s/article/exporting-metering-data
 :)
xquery version "1.0-ml";

declare variable $start := xs:dateTime ("2018-03-15T00:00:00"); (: <= edit where to start :)
declare variable $end := $start + xs:dayTimeDuration("P1D"); (: <= calculate end dateTime, or give exact as for $start :)
declare variable $batch := 3000; (: <= lower this value in case of expanded tree errors :)
declare variable $output-dir := '/tmp'; (: <= directory where files will be written :)

declare function local:meters-export ($uris, $count, $batch) {
    if ($uris) then (
        xdmp:invoke-function (
            function() {
                xdmp:log ('writing ' || $output-dir || "/meters-" || $count || ".zip"),
                xdmp:save (
                    $output-dir || "/meters-" || $count || ".zip", 
                    xdmp:zip-create (
                        <parts xmlns="xdmp:zip">{
                             fn:subsequence ($uris,1,$batch) ! element { fn:QName ("xdmp:zip", "part") } {.}
                        }</parts>,
                        fn:subsequence ($uris,1,$batch) ! fn:doc(.)
                    ),
                    <options xmlns="xdmp:save">
                    <encoding>utf8</encoding>
                    </options>
                )
            }, 
            <options xmlns="xdmp:eval">
                <isolation>different-transaction</isolation>
                <transaction-mode>update-auto-commit</transaction-mode>
            </options>
        )
        ,
        local:meters-export (fn:subsequence ($uris,$batch + 1), $count + 1, $batch)
    ) else ()
};

let $uris :=
    cts:uris ((), ("eager", "concurrent", "score-zero", "document"),
        cts:and-query ((
            cts:element-range-query (fn:QName ("http://marklogic.com/manage/meters","start-time"), ">", $start),
            cts:element-range-query (fn:QName ("http://marklogic.com/manage/meters","end-time"), "<", $end)
        ))
    )
return local:meters-export ($uris, 0, $batch)
