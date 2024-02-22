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
          admin:appserver-set-ssl-ciphers(
            $config, 
            $item,
            "DHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256"
          )
        )
      )
    else
      ""
