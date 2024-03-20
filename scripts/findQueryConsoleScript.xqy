(:
 : Find scripts previously executed in Query Console.  See below for configuration and examples.
 :)
declare namespace qc = "http://marklogic.com/appservices/qconsole";

(: START: script configuration :)
(:
 : Lots of choices for the query.  Below are examples.  Combine with cts:and-query, cts:or-query, etc.
 :
 : To simply get the most recent, set $q to:
 :
 :     cts:and-query(())
 :
 : Providing "Word Searches" is enabled on the App-Services database, one may perform a full text search
 : using CTS queries or ML's string grammar; e.g., one could set $q to:
 :
 :     "cat OR dog"
 :
 : To restrict to the current user's queries, set $q to:
 :
 :     cts:element-value-query(xs:QName("qc:userid"), xs:string(xdmp:get-current-userid()))
 :
 : To restrict to a specified user's queries, set $q to:
 :
 :     cts:element-value-query(xs:QName("qc:userid"), xs:string(xdmp:user("someUserName")))
 : 
 :)
let $q := cts:and-query(())

let $start := 1
let $end := 10

(: Set to "descending" for most recent and "ascending" for oldest. :)
let $order := "descending"
(: END: script configuration :)

return cts:search(
  /qc:history, 
  $q,
  cts:index-order(cts:element-reference(xs:QName("qc:timestamp")), $order)
)[$start to $end]
