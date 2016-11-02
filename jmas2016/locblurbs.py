import json
import re

secre = re.compile('<section id="([a-z]+)">')

inf = open('locblurbs.html')
outf = open('client/locblurbs.js', 'w')
outf.write("""// this file generated automatically. don't edit by hand, silly

locblurb = {
""")

for line in inf:
    m = secre.match(line)
    if m:
        id = m.groups()[0]
        blurb = ''
        continue
    if "</section>" in line:
        outf.write("  " + id + ": " + json.dumps(blurb) + ",\n")
        continue
    blurb += line

outf.write("""
}
""")
    
        
        
    
    
    
