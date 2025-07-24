(:
 : Use to list (preview) or delete a tenant's amps.
 :
 : In a multi-tenancy deployment, there will be amps with the same local name.  This script
 : will only delete a single tenant's amps as amps are specific to a modules database and
 : each tenant gets their own modules database.
 :
 : Directions:
 : 1. Create a backup of the Security database.
 : 2. Specify the tenant name in the configuration section and initially set $preview to fn:true().
 : 3. Evaluate against the Security database.
 : 4. If you want to actually delete the amps, run again with $preview set to fn:false().
 :)
xquery version "1.0-ml";
import module namespace sec="http://marklogic.com/xdmp/security" at 
    "/MarkLogic/security.xqy";

(: START: Configuration :)
let $preview := fn:true()
let $tenant-name := "lux"
(: END: Configuration :)

let $database-name := $tenant-name || "-modules"
let $amp-docs := /fn:collection(sec:amps-collection())[sec:amp/sec:database/text() = $database-name]
let $namespace := ''

return
for $doc in $amp-docs
  let $name := $doc/sec:amp/sec:local-name
  let $lib := $doc/sec:amp/sec:document-uri
  let $ref := "'" || $name || "' amp in the '" || $lib || "' library of the '" || $database-name || "' database."
  return 
    if ($preview) then
      "PREVIEW: " || $ref
    else (
      sec:remove-amp($namespace, $name, $lib, $database-name),
      "DELETED: " || $ref
    )