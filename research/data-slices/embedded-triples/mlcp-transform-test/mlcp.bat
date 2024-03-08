@REM Works via ml-gradle.  Wants XQuery main module or SJS exported function.
@REM Does not want MJS main module or MJS exported function.
c:\opt\mlcp\mlcp-11.1.0\bin\mlcp.bat ^
   import ^
  -host localhost ^
  -port 8007 ^
  -ssl false ^
  -username admin ^
  -password admin ^
  -database embedded-triples-content ^
  -input_file_path "./data" ^
  -output_permissions "embedded-triples-lux,read" ^
  -output_uri_replace ".*/data/,'/data/'" ^
  -output_collections "mlcp" ^
  -transform_module /mlcpTransforms.sjs ^
  -transform_function applyDataSliceConfiguration
