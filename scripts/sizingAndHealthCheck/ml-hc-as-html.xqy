(:
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
:)
xquery version "1.0-ml";
declare namespace hc = "http://marklogic.com/health-check";
declare namespace html = "http://www.w3.org/1999/xhtml";

declare function local:get-section-row($label, $section-name, $os-dump) {
  <tr>
    <td>{ $label }</td>
    <td>{$os-dump/hc:section[hc:name eq $section-name]/hc:output/fn:normalize-space(.)}</td>
  </tr>

};

let $os-dump := xdmp:document-get("/Path/To/Script/Output/ml-hc-ml001-2017-02-24-102336.xml")/hc:health-check

let $report := 
<html>
  <style>
  {
'
div {
  font-family: arial, sans-serif;
}

table {
    font-family: arial, sans-serif;
    border-collapse: collapse;
    width: 100%;
}

td, th {
    border: 1px solid #cccccc;
    text-align: left;
    vertical-align: top;
    padding: 8px;
}

tr:nth-child(even) {
    background-color: #dddddd;
}
'    
  }
  </style>
  <body>
  <div>
    <h3>OS Settings</h3>
    <table>
      <tr>
	      <th>Setting</th><th>Value</th>
      </tr>
      {
        for $i in $os-dump/hc:section
        return
          <tr>
            <td>{ fn:string($i/hc:name) }</td>
            <td><pre>{ fn:string($i/hc:output) }</pre></td>
          </tr>
      }
    </table>
  </div>
  
  </body>
</html>

return (
  $report
)
