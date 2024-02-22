import csv
import json
import os
import re

script_dir = os.path.dirname(__file__)
global_fh = open(script_dir + '/pipelineDataConstants.json')
global_data = global_fh.read()
global_fh.close()
global_map = json.loads(global_data)

# 904: By defining database defaults herein and only specifying the overrides at the field level, the 
#      mlUpdateIndexes portion of the ML deployment gets down to two minutes.
database_config_json = {
        "stemmed-searches": "off",
        "word-searches": False,
        "field-value-searches": False,
        "field-value-positions": False,
        "fast-phrase-searches": False,
        "fast-case-sensitive-searches": False,
        "fast-diacritic-sensitive-searches": False,
        "trailing-wildcard-searches": False,
        "trailing-wildcard-word-positions": False,
        "three-character-searches": False,
        "three-character-word-positions": False,
        "two-character-searches": False,
        "one-character-searches": False,
        "word-positions": True,
        "element-word-positions": False,
        "fast-element-trailing-wildcard-searches": False,
        "word-lexicon": [],
        "range-element-index": [],
        "range-path-index": [],
        "assignment-policy": {
            "assignment-policy-name": "bucket"
        }
    }

def accept_if_not_default(overrides, key, value, defaults = database_config_json):
    if value == defaults[key]:
        overrides.pop(key, None)
    else:
        overrides[key] = value

fields_boilerplate = {
        "field-name": "",
        "include-root": True,
        "excluded-element": [
            {
            "namespace-uri": "",
            "localname": "_label",
            "attribute-namespace-uri": "",
            "attribute-localname": "",
            "attribute-value": ""
            },
            {
            "namespace-uri": "",
            "localname": "id",
            "attribute-namespace-uri": "",
            "attribute-localname": "",
            "attribute-value": ""
            }
        ]
    }

with open(script_dir + '/input.tsv') as csv_file:
    reader = csv.DictReader(csv_file, delimiter='\t')
    fields = [fields_boilerplate]
    field_range_indexes = []
    for row in reader:
        stn = row['Search Tag Name']
        stn = stn.strip()
        if not stn:
            continue
        path = row['JSON Path']
        if not path or not path[0] == "/":
            continue

        force_range_index = row['Force Range Index?'] == 'Y'
        semantic = row['Semantic?']
        qt = row['Query Type']
        path = path.replace('"', "'")
        paths = path.split(' , ')
        np = []
        for p in paths:
            p = p.strip()
            if "$" in p:
                for (k, v) in global_map.items():
                    # Presumes all variable references are immediately surrounded by single quotes.
                    # Added this to ensure a shorter variable name that starts the same is not used (e.g., collection vs. collectionItem).
                    # Better may be to process the variable references in order of variable name length --longest to shortest.
                    # We do have a safety check at the end for unresolved variables though.
                    p = p.replace("'$" + k + "'", "'" + f"{v}" + "'")
            np.append({"path": p, "weight": 1})
        

        field = {
            "field-name": stn,
            "field-path": np
        }
        accept_if_not_default(field, "stemmed-searches", "off")
        accept_if_not_default(field, "word-searches", False)
        accept_if_not_default(field, "field-value-searches", False)
        accept_if_not_default(field, "field-value-positions", False)
        accept_if_not_default(field, "fast-phrase-searches", False)
        accept_if_not_default(field, "fast-case-sensitive-searches", False)
        accept_if_not_default(field, "fast-diacritic-sensitive-searches", False)
        accept_if_not_default(field, "trailing-wildcard-searches", False)
        accept_if_not_default(field, "trailing-wildcard-word-positions", False)
        accept_if_not_default(field, "three-character-searches", False)
        accept_if_not_default(field, "three-character-word-positions", False)
        accept_if_not_default(field, "two-character-searches", False)
        accept_if_not_default(field, "one-character-searches", False)

        field_range_index = {
            "collation": "http://marklogic.com/collation/codepoint",
            "field-name": stn,
            "range-value-positions": False,
            "invalid-values": "ignore",
            "scalar-type": "string"
        }

        if qt == "keyword":
            # Keyword fields need quite a bit enabled.
            accept_if_not_default(field, "stemmed-searches", "basic")
            accept_if_not_default(field, "word-searches", True)
            accept_if_not_default(field, "field-value-searches", True)
            accept_if_not_default(field, "field-value-positions", True)
            accept_if_not_default(field, "fast-phrase-searches", True)
            accept_if_not_default(field, "fast-case-sensitive-searches", True)
            accept_if_not_default(field, "fast-diacritic-sensitive-searches", True)
            accept_if_not_default(field, "trailing-wildcard-searches", True)
            accept_if_not_default(field, "trailing-wildcard-word-positions", True)
            accept_if_not_default(field, "three-character-searches", True)
            accept_if_not_default(field, "three-character-word-positions", True)
            # force_range_index was introduced to configure range indexes for some keyword fields, in support of auto complete.
            if force_range_index:
                pass
            else:
                field_range_index = False

        elif stn.endswith('Identifier') or stn.endswith('Id'):
            # Id / Identifier is the URI of a referenced fieldord, does need faceting
            # Does NOT need keyword indexing, but does need field-value-searches 
            accept_if_not_default(field, "field-value-searches", True)
        
        elif qt == "string" and "Sort" in stn:
            # sort indexes need an index, but not keywords unless overridden by force_range_index (covered above)
            pass
        elif qt == "datesAsString":
            pass
        elif qt == "datesAsFloat":
            field_range_index['scalar-type'] = "float"
            field_range_index['collation'] = ""
        elif qt == "numbers":
            field_range_index['scalar-type'] = "float"
            field_range_index['collation'] = ""
            if stn.endswith('Boolean'):
                accept_if_not_default(field, "field-value-searches", True)
        else:
            field_range_index = False            

        fields.append(field)
        if field_range_index:
            field_range_indexes.append(field_range_index)

database_config_json["field"] = fields
database_config_json["range-field-index"] = field_range_indexes

database_config_str = json.dumps(database_config_json, indent=2)

# Safety check
regex = r'([$][0-9a-zA-Z]+)'
res = re.findall(regex, database_config_str)
if res:
  raise Exception("Thou shall not pass due to an unresolved variable reference(s): " + ', '.join(set(res)))

fh = open(script_dir + '/../../config/contentDatabaseConfGenerated.json', 'w')
fh.write(database_config_str)
fh.close()
