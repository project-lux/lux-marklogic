## **LUX Backend: Importing Data**

- [Import Data Using MLCP via Command Line](#import-data-using-mlcp-via-command-line)
- [More Information on MLCP](#more-information-on-mlcp)

# Import Data Using MLCP via Command Line

Whether it be loading into a local developer environment or a shared environment, this project runs MLCP at the command line.

See [LUX Backend Security and Software](/docs/lux-backend-security-and-software.md#software) for software versions.

1. Download and install a compatible JVM.
2. Download and extract the MLCP binaries version matching the ML version from https://developer.marklogic.com/products/mlcp/.
3. Clear the `%%appName%%-content` database from the admin console or Gradle:

    `./gradlew -i mlClearDatabase -PenvironmentName=[name] -Pdatabase=[databaseName] -Pconfirm=true`

4. See [Detecting Conflicts Between Data and Index Configuration](/docs/lux-backend-database-indexing.md#detecting-conflicts-between-data-and-index-configuration) if interested in doing so.
5. Configure and run the following command.

    If you receive a memory heap error, give the Java process more memory. Try using ```set JVM_OPTS=-Xmx1G``` in CMD(if you are using windows OS)

6. Check [Steps After Importing Data](#steps-after-importing-data)

*The transform function is responsible for setting document permissions.*

```bash
[nohup] sh mlcp.sh import \
  -host [yourHost] \
  -port 8000 \
  -ssl true \
  -username [yourUsername] \
  -password [yourPassword] \
  -database [%%mlAppName%%-content] \
  -modules [%%mlAppName%%-modules] \
  -fastload \
  -input_file_path /path/to/dataset.jsonl.gz \
  -input_file_type delimited_json \
  -input_compressed true \
  -input_compression_codec gzip \
  -transform_module /documentTransforms.sjs \
  -transform_function associateDocToDataSlice \
  -uri_id id
```

# More Information on MLCP

For more information on MLCP, see the [MLCP User Guide](https://docs.marklogic.com/guide/mlcp), specifically the [Importing Content Into MarkLogic Server](https://docs.marklogic.com/guide/mlcp/import) chapter and [Import Command Line Options](https://docs.marklogic.com/guide/mlcp/import#id_23879) section thereof.
