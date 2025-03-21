(:
 : Use to delete users and/or generate code to delete roles where the user and
 : role names begin with a configurable string.
 :
 : Directions:
 : 1. Create a backup of the Security database.
 : 2. Update the configuration section, initially setting $preview to fn:true().
 : 3. Evaluate against the Security database.
 : 4. If you want to actually delete the users, run again with $preview set to fn:false().
 : 5. If you want to delete the roles, copy the generated code into a new tab and run.
 :    The code to delete users is generated versus executed to avoid conflicting updates.
 : 6. If you are planning to recreate any of these roles and those roles are associated 
 :    to existing amps, you may need to recreate the amps after recreating the roles.
 :    deleteAmps.xqy can help.
 :)
xquery version "1.0-ml";

import module namespace sec="http://marklogic.com/xdmp/security" at 
    "/MarkLogic/security.xqy";

declare function local:contains-at-least-one-string($str as xs:string, $strs as xs:string) as xs:boolean {
  let $booleans := $strs ! (
    fn:contains($str, .)
  )
	return $booleans = fn:true()
};

(: START of CONFIGURATION SECTION :)
let $preview := fn:true()
let $deleteWhenStartsWith := 'lux'
let $butDoesNotContain := ('by-unit', 'dev-data')
let $deleteUsers := fn:true()
let $deleteRoles := fn:true()
(: END of CONFIGURATION SECTION :)

let $usernames := if ($deleteUsers) then
    for $username in /sec:user/sec:user-name[
        fn:starts-with(., $deleteWhenStartsWith) and 
        fn:not(local:contains-at-least-one-string(., $butDoesNotContain))
    ]/text() 
      order by $username 
      return $username
  else ()
let $roleNames := if ($deleteRoles) then
    for $roleName in /sec:role/sec:role-name[
        fn:starts-with(., $deleteWhenStartsWith) and 
        fn:not(local:contains-at-least-one-string(., $butDoesNotContain))
    ]/text()
      order by $roleName
      return $roleName
  else ()
  
return
  <delete preview="{$preview}">
    <users>{
      for $username in $usernames return (
        if ($preview) then () else sec:remove-user($username),
        <user>{$username}</user>
      )
    }</users>
    <roles>{
      if ($preview) then
        for $roleName in $roleNames return <role>{$roleName}</role>
      else 
        <code>
{
  fn:string-join(
    for $roleName in $roleNames return (
      "xquery version '1.0-ml';",
      "import module namespace sec='http://marklogic.com/xdmp/security' at '/MarkLogic/security.xqy';",
      fn:concat("sec:remove-role('", $roleName, "');")
    ),
    "&#10;"
  )
}
        </code>
    }</roles>
  </delete>
