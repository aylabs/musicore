#!/usr/bin/env python3
import zipfile, xml.etree.ElementTree as ET, sys
z = zipfile.ZipFile("scores/Beethoven_FurElise.mxl")
data = z.read("score.xml")
z.close()
root = ET.fromstring(data)
for part in root.findall(".//part"):
    for m in part.findall("measure"):
        if m.get("number") == "33":
            sys.stdout.write("=== MEASURE 33 ===\n")
            for elem in m:
                if elem.tag == "note":
                    p = elem.find("pitch")
                    r = elem.find("rest")
                    c = elem.find("chord")
                    d = elem.find("duration")
                    v = elem.find("voice")
                    s = elem.find("staff")
                    t = elem.find("type")
                    st = elem.find("stem")
                    g = elem.find("grace")
                    if r is not None:
                        sys.stdout.write("  REST v=%s s=%s\n" % (v.text if v is not None else "?", s.text if s is not None else "?"))
                    else:
                        step = p.find("step").text
                        oct = p.find("octave").text
                        alt = p.find("alter")
                        av = alt.text if alt is not None else "0"
                        sys.stdout.write("  %s%s/%s chord=%s grace=%s v=%s s=%s dur=%s type=%s stem=%s\n" % (step, av, oct, "Y" if c is not None else "N", "Y" if g is not None else "N", v.text if v is not None else "?", s.text if s is not None else "?", d.text if d is not None else "?", t.text if t is not None else "?", st.text if st is not None else "none"))
                elif elem.tag == "backup":
                    dd = elem.find("duration")
                    sys.stdout.write("  BACKUP dur=%s\n" % (dd.text if dd is not None else "?"))
                elif elem.tag == "attributes":
                    for cc in elem.findall("clef"):
                        sgn = cc.find("sign")
                        ln = cc.find("line")
                        sn = cc.get("number", "?")
                        sys.stdout.write("  CLEF staff=%s sign=%s line=%s\n" % (sn, sgn.text if sgn is not None else "?", ln.text if ln is not None else "?"))
            sys.stdout.flush()
