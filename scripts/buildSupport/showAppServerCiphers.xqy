xquery version "1.0-ml";
import module namespace admin = "http://marklogic.com/xdmp/admin" at "/MarkLogic/admin.xqy";
let $config := admin:get-configuration()
let $appservers := admin:get-appserver-ids($config)
let $ciphers := for $item in $appservers
  let $appservername := admin:appserver-get-name($config, $item)
  return concat($appservername, ": ", admin:appserver-get-ssl-ciphers($config, $item))
return string-join($ciphers, ", ")