(:
 : Use to delete specific amps and those whose local name begins with a specified string.
 : In a multi-tenancy deployment, there will be amps with the same local name.  This script
 : will only delete a single tenant's amps as amps are specific to a modules database and
 : each tenant gets their own modules database.
 :
 : Directions:
 : 1. Create a backup of the Security database.
 : 2. Update the configuration section, initially setting $preview to fn:true().
 : 3. Evaluate against the Security database.
 : 4. If you want to actually delete the amps, run again with $preview set to fn:false().
 :)
xquery version "1.0-ml";

import module namespace sec="http://marklogic.com/xdmp/security" at 
    "/MarkLogic/security.xqy";

(: START of CONFIGURATION SECTION :)
let $preview := fn:true()
let $tenantName := "lux"
let $ampPrefix := "_execute_with_"
let $ampLibrary := "/lib/wrapperLib.mjs"
let $deleteTheseToo := (
  <amp>
    <name>_getForestInfoByHost</name>
    <library>/lib/environmentLib.mjs</library>
  </amp>,
  <amp>
    <name>_handleRequestV2</name>
    <library>/lib/securityLib.mjs</library>
  </amp>,
  <amp>
    <name>_isServiceAccount</name>
    <library>/lib/securityLib.mjs</library>
  </amp>
)
(: END of CONFIGURATION SECTION :)

let $databaseName := $tenantName || "-modules"
let $databaseId := xdmp:database($databaseName)

let $ampsToDelete := <delete tenant="{$tenantName}" database="{$databaseName}" preview="{$preview}">{(
  for $ampNode in /sec:amp[
      sec:local-name[fn:starts-with(., $ampPrefix)] and 
      sec:database = $databaseName
  ]
    return <amp>
      <name>{$ampNode/sec:local-name/text()}</name>
      <library>{$ampNode/sec:document-uri/text()}</library>
    </amp>,
  $deleteTheseToo
)}</delete>

return (
  if ($preview = fn:false()) then 
    for $node in $ampsToDelete/amp
      return if (sec:amp-exists('', $node/name, $node/library, $databaseId)) then
          sec:remove-amp('', $node/name, $node/library, $databaseId)
        else ()
  else (),
  $ampsToDelete
)
