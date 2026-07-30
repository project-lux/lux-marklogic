#!/usr/bin/env bash
curl --anyauth --user ${USER}:${PASS} -X PUT -i \
    --data-binary @"./associateDocToDataSlice.sjs" \
    -H "Content-type: application/vnd.marklogic-javascript" \
    'http://localhost:8000/LATEST/config/transforms/associateDocToDataSlice'
