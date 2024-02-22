xquery version "1.0-ml";
import module namespace admin = "http://marklogic.com/xdmp/admin" at "/MarkLogic/admin.xqy";
let $config := admin:get-configuration()
let $appservers := admin:get-appserver-ids($config)
for $item in $appservers
  let $appservername := admin:appserver-get-name($config, $item) 
  return
    if ($appservername ne "HealthCheck") then 
      (
        concat($appservername,": "), 
        admin:save-configuration(
          admin:appserver-set-ssl-disabled-protocols(
            $config, 
            $item, 
            ("SSLv3","TLSv1","TLSv1_1")
          )
        )
      )
    else
      ""
