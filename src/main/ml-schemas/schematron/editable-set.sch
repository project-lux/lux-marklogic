<sch:schema xmlns:sch="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2" schemaVersion="1.0">
  <sch:title>invoice-validation</sch:title>
  <sch:phase id="phase1">
    <sch:active pattern="allAsserts"></sch:active>
  </sch:phase>
  <sch:pattern id="allAsserts">
    <sch:rule context="json">
      <sch:assert diagnostics="notSet" test="./type = 'Set'"/>
      <sch:assert diagnostics="invalidClassification" test="./classified_as/equivalent/id = '%%identifierMyCollection%%'"/>
      <sch:assert diagnostics="noName" test="fn:count(./identified_by[type = 'Name']) gt 0"/>
      <sch:assert diagnostics="nameTooLong" test="fn:string-length(./identified_by[type = 'Name']/content) le 200"/>
      <!-- <sch:assert diagnostics="identifierTooLong" test="fn:string-length(identified_by[type = 'Identifier']/content) le 200"/>
      <sch:assert diagnostics="tooManyNotes" test="fn:count(referred_to_by[classified_as/id = 'http://todo.concept.note']) le 30"/>
      <sch:assert diagnostics="noteTooLong" test="fn:string-length(referred_to_by[classified_as/id = 'http://todo.concept.note'])/content le 500"/>
      <sch:assert diagnostics="tooManyClassifications" test="fn:count(referred_to_by[classified_as/id = 'http://todo.concept.note']/classified_as) le 1"/>
      <sch:assert diagnostics="labelTooLong" test="fn:string-length(referred_to_by[classified_as/id = 'http://todo.concept.note']/identified_by[classified_as/id = 'http://todo.concept.display.name']/content) le 200"/> -->
    </sch:rule>
  </sch:pattern>
  <sch:diagnostics>
    <sch:diagnostic id="notSet">/json/type must be Set</sch:diagnostic>
    <sch:diagnostic id="invalidClassification">Not an editable Set</sch:diagnostic>
    <sch:diagnostic id="noName">There must be at least one name</sch:diagnostic>
    <sch:diagnostic id="nameTooLong">Set names may be no longer than 200 characters</sch:diagnostic>
    <sch:diagnostic id="identifierTooLong">Identifiers may be no longer than 200 characters each</sch:diagnostic>
    <sch:diagnostic id="tooManyNotes">There may only be 30 notes</sch:diagnostic>
    <sch:diagnostic id="noteTooLong">Notes may be no longer than 500 characters</sch:diagnostic>
    <sch:diagnostic id="tooManyClassifications">Notes may only have a single classification</sch:diagnostic>
    <sch:diagnostic id="labelTooLong">Label names may be no longer than 200 characters</sch:diagnostic>
  </sch:diagnostics>
</sch:schema>