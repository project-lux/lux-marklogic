(:
 : Use to list (preview) or create a tenant's amps based on another tenant's existing amps.
 :
 : Finds all amps for the source tenant's modules database and creates identical amps
 : targeting a different modules database.
 :
 : Directions:
 : 1. Create a backup of the Security database.
 : 2. Specify the source and target tenant names in the configuration section and initially set $preview to fn:true().
 : 3. Evaluate against the Security database.
 : 4. If you want to actually create the amps, run again with $preview set to fn:false().
 :)
xquery version "1.0-ml";
import module namespace sec="http://marklogic.com/xdmp/security" at 
    "/MarkLogic/security.xqy";

(: START: Configuration :)
let $preview := fn:true()
let $source-tenant-name := "lux-dev-data"
let $target-tenant-name := "lux-dev-data-optic"

(: Additional amps that don't exist in the source tenant :)
let $additional-amps := ()
(: END: Configuration :)

let $database-suffixes := ("-modules", "-test-modules")
let $namespace := ''

return (
  for $database-suffix in $database-suffixes
    let $source-database-name := $source-tenant-name || $database-suffix
    let $target-database-name := $target-tenant-name || $database-suffix
    let $amp-docs := /fn:collection(sec:amps-collection())[sec:amp/sec:database/text() = $source-database-name]
    return
      for $doc in $amp-docs
        let $name := $doc/sec:amp/sec:local-name
        let $lib := $doc/sec:amp/sec:document-uri
        let $roles := $doc/sec:amp/sec:role/text()
        let $ref := "'" || $name || "' amp in the '" || $lib || "' library of the '" || $target-database-name || "' database."
        return 
          if ($preview) then
            "PREVIEW: " || $ref
          else
            try {
              sec:create-amp($namespace, $name, $lib, $target-database-name, $roles),
              "CREATED: " || $ref
            } catch ($e) {
              if ($e/error:code = "SEC-AMPEXISTS") then
                "SKIPPED (already exists): " || $ref
              else
                fn:error(xs:QName($e/error:name), $e/error:message)
            },
  for $amp in $additional-amps
    let $target-database-name := $target-tenant-name || "-modules"
    let $name := map:get($amp, "name")
    let $lib := map:get($amp, "lib")
    let $roles := map:get($amp, "roles")
    let $ref := "'" || $name || "' amp in the '" || $lib || "' library of the '" || $target-database-name || "' database."
    return
      if ($preview) then
        "ADDITIONAL: " || $ref
      else
        try {
          sec:create-amp($namespace, $name, $lib, $target-database-name, $roles),
          "CREATED (additional): " || $ref
        } catch ($e) {
          if ($e/error:code = "SEC-AMPEXISTS") then
            "SKIPPED (already exists): " || $ref
          else
            fn:error(xs:QName($e/error:name), $e/error:message)
        }
)
