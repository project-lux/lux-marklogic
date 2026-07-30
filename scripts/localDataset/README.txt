1. Run get-dataset.js in QC
2. Download output of get-dataset.js
3. Wrangle output into just an array of URIs
4. Paste array into export-collection.js and run in QC
5. Run flux-export-command
6. Run uploadTransform.sh (make sure you have associateDocToDataSlice.sjs in the same folder)
7. Run flux-import-command
8. Congrats you have local data, now clean up your temporary collection 
9. change export-collection.js so that it says `documentRemoveCollections` instead of `documentAddCollections`
10. Run export-collections.js again to remove your temporary export collection