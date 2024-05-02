(:
 : Starting with a list of primary forest names, this script disables (but does not delete)
 : their replica forests.
 :)

xquery version "1.0-ml";

import module namespace admin = "http://marklogic.com/xdmp/admin" at "/MarkLogic/admin.xqy";

let $primary-forests := (
  "lux-content-1",
  "lux-content-2",
  "lux-content-3",
  "lux-content-4",
  "lux-content-5",
  "lux-content-6",
  "lux-content-7",
  "lux-content-8",
  "lux-content-9",
  "lux-modules-1"
)

let $config := admin:get-configuration()
let $_ := for $primary-forest in $primary-forests
  let $primary-forest-id := xdmp:forest($primary-forest)
  return
    for $replica-forest-id in admin:forest-get-replicas($config, $primary-forest-id)
      return xdmp:set(
        $config, 
        admin:forest-set-failover-enable(
          admin:forest-remove-replica($config, $primary-forest-id, $replica-forest-id),
          $primary-forest-id, 
          fn:false()
        )
      )
return
admin:save-configuration-without-restart($config)
