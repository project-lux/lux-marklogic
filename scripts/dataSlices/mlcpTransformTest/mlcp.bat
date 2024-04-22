@REM Works via ml-gradle.  Wants XQuery main module or SJS exported function.
@REM Does not want MJS main module or MJS exported function.
c:\opt\mlcp\mlcp-11.1.0\bin\mlcp.bat ^
   import ^
  -host localhost ^
  -port 8005 ^
  -ssl false ^
  -username admin ^
  -password admin ^
  -database lux-content ^
  -fastload ^
  -input_file_path "c:\tmp\ycba_yuag_sources\*.jsonl" ^
  -input_file_type delimited_json ^
  -uri_id id ^
  -output_collections "mlcp" ^
  -transform_module /documentTransforms.sjs ^
  -transform_function associateDocToDataSlice ^
  -batch_size 200 ^
  -max_threads 4
