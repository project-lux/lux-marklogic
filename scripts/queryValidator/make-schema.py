import requests
import copy
import json

resp = requests.get("https://lux.collections.yale.edu/api/advanced-search-config")
config = resp.json()

scopeList = list(config["terms"].keys())


# Now we need configs to be built based on the keys per scope, with a range based on relation

schema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://lux.collections.yale.edu/api/search-schema",
    "title": "Advanced Search Schema",
    "description": "LUX Advanced Search JSON Schema",
    "anyOf": [
        {"$ref": "#/definitions/_TOP"}
    ],
    "definitions": {
        "_TOP": {
            "type": "object",
            "additionalProperties": False,
            "required": ["q"],
            "properties": {"q": {"$ref": "#/definitions/_QUERY"}}
        },
        "_QUERY": {
            "anyOf": [
                {"$ref": "#/definitions/_BOOLS"},
                {"$ref": "#/definitions/_SCOPES"},
            ]
        },
        "_SCOPES": {"anyOf": []},
        "_BOOLS": {
            "title": "Boolean Operators",
            "anyOf": [
                {"$ref": "#/definitions/_AND"},
                {"$ref": "#/definitions/_OR"},
                {"$ref": "#/definitions/_NOT"},
            ],
        },
        "_AND": {
            "title": "Boolean AND",
            "description": "All of the operands must match",
            "additionalProperties": False,
            "minProperties": 1,
            "properties": {
                "AND": {
                    "type": "array",
                    "minItems": 1,
                    "items": {"$ref": "#/definitions/_QUERY"},
                }
            },
        },
        "_OR": {
            "title": "Boolean OR",
            "description": "At least one of the operands must match",
            "additionalProperties": False,
            "minProperties": 1,
            "properties": {
                "OR": {
                    "type": "array",
                    "minItems": 1,
                    "items": {"$ref": "#/definitions/_QUERY"},
                }
            },
        },
        "_NOT": {
            "title": "Boolean NOT",
            "description": "None of the operands must match",
            "additionalProperties": False,
            "minProperties": 1,
            "properties": {
                "NOT": {
                    "type": "array",
                    "minItems": 1,
                    "items": {"$ref": "#/definitions/_QUERY"},
                }
            }
        }
    }
}


scope_block = {
    "_QUERY_": {
        "anyOf": [{"$ref": "#/definitions/_BOOLS_"}, {"$ref": "#/definitions/_SCOPE_"}]
    },
    "_BOOLS_": {
        "title": "Boolean Operators",
        "anyOf": [
            {"$ref": "#/definitions/_AND_"},
            {"$ref": "#/definitions/_OR_"},
            {"$ref": "#/definitions/_NOT_"},
        ],
    },
    "_AND_": {
        "title": "Boolean AND",
        "description": "All of the operands must match",
        "additionalProperties": False,
        "minProperties": 1,
        "properties": {
            "AND": {
                "type": "array",
                "minItems": 1,
                "items": {"$ref": "#/definitions/_QUERY_"},
            }
        },
    },
    "_OR_": {
        "title": "Boolean OR",
        "description": "At least one of the operands must match",
        "additionalProperties": False,
        "minProperties": 1,
        "properties": {
            "OR": {
                "type": "array",
                "minItems": 1,
                "items": {"$ref": "#/definitions/_QUERY_"},
            }
        },
    },
    "_NOT_": {
        "title": "Boolean NOT",
        "description": "None of the operands must match",
        "additionalProperties": False,
        "minProperties": 1,
        "properties": {
            "NOT": {
                "type": "array",
                "minItems": 1,
                "items": {"$ref": "#/definitions/_QUERY_"},
            }
        },
    },
}


opt_comp = {"type": "string", "enum": [">", ">=", "=", "<", "<=", "!="]}
kw_options = {
    "type": "array",
    "items": {"type": "string", "enum": config["options"]["keyword"]["allowed"]},
}
exact_options = {
    "type": "array",
    "items": {"type": "string", "enum": config["options"]["exact"]["allowed"]},
}
opt_weight = {"type": "number"}
opt_lang = {"type": "string"}
opt_complete = {"type": "boolean"}

schema["definitions"]["_OPT_KW"] = kw_options
schema["definitions"]["_OPT_EXACT"] = exact_options
schema["definitions"]["_OPT_WEIGHT"] = opt_weight
schema["definitions"]["_OPT_COMPLETE"] = opt_complete
schema["definitions"]["_OPT_COMP"] = opt_comp
schema["definitions"]["_OPT_LANG"] = opt_lang


scopes = {}
for s in scopeList:
    schema["definitions"]["_SCOPES"]["anyOf"].append(
        {"$ref": "#/definitions/_SCOPE_" + s}
    )

    schema['anyOf'].append({"$ref": "#/definitions/_TOP_" + s})
    schema["definitions"]["_TOP_" + s] = {
        "type": "object",
        "additionalProperties": False,
        "required": ["q", "scope"],
        "properties":
        {
            "q":
            {
                "$ref": "#/definitions/_QUERY_" +s
            },
            "scope": {"type": "string", "enum": [s]}
        }
    }

    for k, v in scope_block.items():
        v2 = copy.deepcopy(v)
        if "anyOf" in v2:
            for ref in v2["anyOf"]:
                ref["$ref"] = ref["$ref"] + s
        elif "properties" in v2:
            bl = list(v2["properties"].keys())[0]
            v2["properties"][bl]["items"]["$ref"] = (
                v2["properties"][bl]["items"]["$ref"] + s
            )
        schema["definitions"][k + s] = v2

    scope = {"anyOf": []}
    for k, v in config["terms"][s].items():
        sub = {
            "type": "object",
            "additionalProperties": False,
            "required": [k],
            "properties": {},
        }
        prop = {"title": v.get("label", k), "description": v.get("helpText", "")}

        if v["relation"] == "text":
            # keyword
            prop["type"] = "string"
            if "allowedOptionsName" in v:
                if v["allowedOptionsName"] == "keyword":
                    # add _options with kw enum
                    sub["properties"]["_options"] = {"$ref": "#/definitions/_OPT_KW"}
                    sub["properties"]["_weight"] = {"$ref": "#/definitions/_OPT_WEIGHT"}
                    sub["properties"]["_complete"] = {
                        "$ref": "#/definitions/_OPT_COMPLETE"
                    }
                    sub["properties"]["_lang"] = {"$ref": "#/definitions/_OPT_LANG"}
                elif v["allowedOptionsName"] == "exact":
                    # add _options with exact enum
                    sub["properties"]["_options"] = {"$ref": "#/definitions/_OPT_EXACT"}
                    sub["properties"]["_weight"] = {"$ref": "#/definitions/_OPT_WEIGHT"}
                    sub["properties"]["_complete"] = {
                        "$ref": "#/definitions/_OPT_COMPLETE"
                    }
                else:
                    print(
                        f"Unknown options type {v['allowedOptionsName']} in {k} in {s}"
                    )
                    raise (v["allowedOptionsName"])
        elif v["relation"] == "date":
            # date string
            prop["type"] = "string"
            prop["format"] = "date-time"
            sub["properties"]["_weight"] = {"$ref": "#/definitions/_OPT_WEIGHT"}
            sub["properties"]["_comp"] = {"$ref": "#/definitions/_OPT_COMP"}
        elif v["relation"] == "float":
            # number
            prop["type"] = "number"
            sub["properties"]["_weight"] = {"$ref": "#/definitions/_OPT_WEIGHT"}
            sub["properties"]["_comp"] = {"$ref": "#/definitions/_OPT_COMP"}
        elif v["relation"] == "boolean":
            # bool
            prop["type"] = "number"
            prop["minimum"] = 0
            prop["maximum"] = 1
            sub["properties"]["_weight"] = {"$ref": "#/definitions/_OPT_WEIGHT"}
        elif v["relation"] in scopeList:
            # relationship to new scope
            prop["type"] = "object"
            prop["$ref"] = "#/definitions/_QUERY_" + v["relation"]
        else:
            print(f"Unmatched relation {v['relation']} in {k} in {s}")
            raise ValueError(v["relation"])
        sub["properties"][k] = prop
        scope["anyOf"].append(sub)
    schema["definitions"]["_SCOPE_" + s] = scope

outstr = json.dumps(schema)
fh = open("generated_schema.json", "w")
fh.write(outstr)
fh.close()
