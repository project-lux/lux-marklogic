import json
from jsonschema import Draft202012Validator
from urllib.parse import unquote
import gzip

# Tests from Advanced Search help
positive_tests = [
    """%7B"AND"%3A%5B%7B"producedBy"%3A%7B"id"%3A"https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fperson%2Fe24b2be2-1cb9-4152-a50d-855fdfbcb4c9"%7D%7D%2C%7B"classification"%3A%7B"id"%3A"https%3A%2F%2Flux.collections.yale.edu%2Fdata%2Fconcept%2Fe9f947cd-c8c4-4852-a72e-f62fc6de6388"%7D%7D%5D%7D""",
    """%7B"OR"%3A%5B%7B"AND"%3A%5B%7B"OR"%3A%5B%7B"name"%3A"Yosemite"%7D%2C%7B"encounteredAt"%3A%7B"name"%3A"Yosemite"%7D%7D%5D%7D%2C%7B"OR"%3A%5B%7B"AND"%3A%5B%7B"encounteredDate"%3A"1850-12-31"%2C"_comp"%3A">"%7D%2C%7B"encounteredDate"%3A"1900-01-01"%2C"_comp"%3A"<"%7D%5D%7D%2C%7B"AND"%3A%5B%7B"producedDate"%3A"1850-12-31"%2C"_comp"%3A">"%7D%2C%7B"producedDate"%3A"1900-01-01"%2C"_comp"%3A"<"%7D%5D%7D%5D%7D%2C%7B"classification"%3A%7B"OR"%3A%5B%7B"name"%3A"painting"%7D%2C%7B"name"%3A"print"%7D%2C%7B"name"%3A"plant"%7D%2C%7B"name"%3A"drawing"%7D%2C%7B"name"%3A"photo*"%7D%5D%7D%7D%5D%7D%2C%7B"carries"%3A%7B"AND"%3A%5B%7B"OR"%3A%5B%7B"aboutPlace"%3A%7B"name"%3A"yosemite"%7D%7D%2C%7B"aboutConcept"%3A%7B"name"%3A"yosemite"%7D%7D%5D%7D%2C%7B"OR"%3A%5B%7B"AND"%3A%5B%7B"createdDate"%3A"1850-12-31"%2C"_comp"%3A">"%7D%2C%7B"createdDate"%3A"1900-01-01"%2C"_comp"%3A"<"%7D%5D%7D%2C%7B"AND"%3A%5B%7B"publishedDate"%3A"1850-12-31"%2C"_comp"%3A">"%7D%2C%7B"publishedDate"%3A"1900-01-01"%2C"_comp"%3A"<"%7D%5D%7D%5D%7D%5D%7D%7D%5D%7D""",
    """%7B"AND":%5b%7B"classification":%7B"name":"painting"%7D%7D,%7B"carries":%7B"aboutAgent":%7B"encountered":%7B"classification":%7B"name":"fossil"%7D%7D%7D%7D%7D%5d%7D""",
    """%7B%22AND%22:[%7B%22OR%22:[%7B%22memberOf%22:%7B%22name%22:%22peabody%22%7D%7D,%7B%22memberOf%22:%7B%22name%22:%22yale%20university%20art%20gallery%22%7D%7D]%7D,%7B%22name%22:%22ceramics%22%7D]%7D""",
    """%7B"AND"%3A%5B%7B"NOT"%3A%5B%7B"memberOf"%3A%7B"name"%3A"library"%7D%7D%5D%7D%2C%7B"OR"%3A%5B%7B"text"%3A"botany"%7D%2C%7B"text"%3A"flowers"%7D%2C%7B"text"%3A"plants"%7D%5D%7D%5D%7D""",
    """%7B"AND"%3A%5B%7B"carries"%3A%7B"AND"%3A%5B%7B"createdBy"%3A%7B"name"%3A"shakespeare"%7D%7D%2C%7B"publishedDate"%3A"1623-01-01"%2C"_comp"%3A"%3D"%7D%5D%7D%7D%2C%7B"name"%3A"+Mr.+William+Shakespeares+comedies%2C+histories+%26+tragedies+%3A+published+according+to+the+true+originall+copies"%2C"_options"%3A%5B"unstemmed"%2C"unwildcarded"%5D%2C"_complete"%3Atrue%7D%5D%7D""",
    """%7B"OR":[%7B"AND":[%7B"classification":%7B"name":"sculpture"%7D%7D,%7B"material":%7B"name":"bronze"%7D%7D]%7D,%7B"AND":[%7B"carries":%7B"AND":[%7B"classification":%7B"name":"sculpture"%7D%7D,%7B"text":"bronze"%7D]%7D%7D,%7B"NOT":[%7B"memberOf":%7B"name":"internet"%7D%7D]%7D]%7D]%7D""",
    """%7B"AND"%3A%5B%7B"OR"%3A%5B%7B"text"%3A"dogs"%7D%2C%7B"text"%3A"cats"%7D%2C%7B"carries"%3A%7B"OR"%3A%5B%7B"aboutConcept"%3A%7B"name"%3A"cats"%7D%7D%2C%7B"aboutConcept"%3A%7B"name"%3A"dogs"%7D%7D%5D%7D%7D%5D%7D%2C%7B"producedBy"%3A%7B"startAt"%3A%7B"name"%3A"london"%7D%7D%7D%2C%7B"producedDate"%3A"1950-01-01"%2C"_comp"%3A">%3D"%7D%5D%7D""",
    """%7B"AND":[%7B"encounteredBy":%7B"id":"https://lux.collections.yale.edu/data/person/0e18b37e-cae6-4657-8d36-cebf83a5a36d"%7D%7D,%7B"encounteredAt":%7B"OR":[%7B"name":"nebraska"%7D,%7B"partOf":%7B"OR":[%7B"name":"nebraska"%7D,%7B"partOf":%7B"OR":[%7B"name":"nebraska"%7D]%7D%7D]%7D%7D]%7D%7D]%7D""",
    """%7B"OR"%3A%5B%7B"encounteredBy"%3A%7B"startAt"%3A%7B"name"%3A"New+Haven"%7D%7D%7D%2C%7B"producedBy"%3A%7B"startAt"%3A%7B"name"%3A"New+Haven"%7D%7D%7D%5D%7D""",
    """%7B"AND":[%7B"name":"dirus"%7D,%7B"encounteredAt":%7B"OR":[%7B"name":"california"%7D,%7B"partOf":%7B"name":"california"%7D%7D,%7B"partOf":%7B"partOf":%7B"name":"california"%7D%7D%7D]%7D%7D]%7D""",
    """%7B"AND"%3A%5B%7B"createdBy"%3A%7B"gender"%3A%7B"name"%3A"female"%7D%7D%7D%2C%7B"createdBy"%3A%7B"startAt"%3A%7B"classification"%3A%7B"name"%3A"city"%7D%7D%7D%7D%5D%7D""",
    """%7B"AND"%3A%5B%7B"aboutAgent"%3A%7B"name"%3A"gertrude+stein"%7D%7D%2C%7B"classification"%3A%7B"name"%3A"archives"%7D%7D%5D%7D""",
    """%7B"OR":[%7B"produced":%7B"classification":%7B"name":"forgery"%7D%7D%7D,%7B"created":%7B"OR":[%7B"classification":%7B"name":"forgery"%7D%7D]%7D%7D]%7D""",
    """%7B"AND"%3A%5B%7B"OR"%3A%5B%7B"startAt"%3A%7B"name"%3A"nederland"%7D%7D%2C%7B"endAt"%3A%7B"name"%3A"nederland"%7D%7D%2C%7B"activeAt"%3A%7B"name"%3A"nederland"%7D%7D%2C%7B"nationality"%3A%7B"name"%3A"dutch"%7D%7D%2C%7B"nationality"%3A%7B"name"%3A"flemish"%7D%7D%2C%7B"nationality"%3A%7B"name"%3A"netherlandish"%7D%7D%5D%7D%2C%7B"produced"%3A%7B"memberOf"%3A%7B"name"%3A"yale+center+for+british+art"%7D%7D%7D%5D%7D""",
    """%7B"AND"%3A%5B%7B"encounteredHere"%3A%7B"encounteredBy"%3A%7B"name"%3A"john+bell+hatcher"%7D%7D%7D%5D%7D""",
    """%7B"OR"%3A%5B%7B"name"%3A"quercus"%7D%2C%7B"classification"%3A%7B"name"%3A"quercus"%7D%7D%5D%7D""",
    """%7B"used"%3A%7B"containingItem"%3A%7B"carries"%3A%7B"aboutConcept"%3A%7B"name"%3A"zebra"%7D%7D%7D%7D%7D""",
]

negative_tests = [
    {"fish": 1},
    {"AND": {"text": "any"}},
    {"NOTABOOL": [{"text": "any"}]},
    {"text": [{"text": "any"}]},
    {"text": 1},
    {"text": {"text": "any"}},
    {"_options": "fish"},
    {"text": "any", "_options": "none"},
    {"text": "any", "_options": "exact"},
    {"text": "any", "_options": ["none"]},
    {"q": {}, "scope": "agent"},
]

fh = gzip.open('blue-30-days-of-searches-2024-12-06.txt.gz')
lines = fh.readlines()
fh.close()
queries = []
for l in lines:
    scope, qstr = l.decode('utf-8').strip().split(';',1)
    q = json.loads(qstr)
    queries.append({"q": q, "scope": scope})

def process(data):
    errs = []
    for error in v.iter_errors(data):
        errs.append(error)
        #   print(error.absolute_schema_path) <-- this is the current path through the schema
        # print(
        #    f"  /{'/'.join([str(x) for x in error.absolute_path])} --> {error.message} "
        # )
    if not errs:
        return False
    return errs

schemafn = "generated_schema.json"
fh = open(schemafn)
schema = json.load(fh)
fh.close()
v = Draft202012Validator(schema)

for t in positive_tests:
    jstr = unquote(t)
    try:
        q = json.loads(jstr)
    except:
        print(jstr)
    error = process({"q": q})
    if error:
        print(f"Failed to validate: {jstr}")

for t in queries:
    if t['scope'] == 'work' and 'partOf' in t['q']:
        t['q']['partOfWork'] = t['q']['partOf']
        del t['q']['partOf']

    error = process(t)
    if error:
        print(f"Failed to validate real query: {json.dumps(t)}")

for t in negative_tests:
    if "q" in t:
        error = process(t)
    else:
        error = process({"q": t})
    if not error:
        jstr = json.dumps(t)
        print(f"Failed to detect error: {jstr}")
