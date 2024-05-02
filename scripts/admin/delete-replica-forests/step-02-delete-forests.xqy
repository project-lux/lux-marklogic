(:
 : Starting with a list of forest names, this script is capable of PERMANENTLY DELETING them.
 : It was originally written to remove replica forests from a subset of environments but there
 : are NO safeguards from deleting primary forests.  Use with extreme caution.
 :)
xquery version "1.0-ml";

import module namespace admin = "http://marklogic.com/xdmp/admin" at "/MarkLogic/admin.xqy";

let $replica-forests := (
  "lux-content-1-replica-1",
  "lux-content-2-replica-1",
  "lux-content-3-replica-1",
  "lux-content-4-replica-1",
  "lux-content-5-replica-1",
  "lux-content-6-replica-1",
  "lux-content-7-replica-1",
  "lux-content-8-replica-1",
  "lux-content-9-replica-1",
  "lux-modules-1-replica-1"
)

return 
admin:save-configuration(
  admin:forest-delete(
    admin:get-configuration(),
    for $name in $replica-forests return xdmp:forest($name),
    fn:true()
  )
)