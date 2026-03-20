#!/usr/bin/env python3
import zipfile, xml.etree.ElementTree as ET, sys

z = zipfile.ZipFile("scores/Beethoven_FurElise.mxl")
data = z.read("score.xml")
z.close()
root = ET.fromstring(data)

for part in root.findall(".//part"):
    for m in part.findall("measure"):
        if m.get("number") in ("52", "53"):
            sys.stdout.write("=== MEASURE %s ===\n" % m.get("number"))
            for elem in m:
                if elem.tag == "note":
                    p = elem.find("pitch")
                    r = elem.find("rest")
                    v = elem.find("voice")
                    s = elem.find("staff")
                    notations = elem.find("notations")
                    if notations is not None:
                        for sl in notations.findall("slur"):
                            attrs = dict(sl.attrib)
                            if r is not None:
                                sys.stdout.write("  [REST] slur attrs: %s\n" % attrs)
                            else:
                                step = p.find("step").text
                                octave = p.find("octave").text
                                vt = v.text if v is not None else "?"
                                sf = s.text if s is not None else "?"
                                sys.stdout.write("  %s/%s v=%s s=%s slur attrs: %s\n" % (step, octave, vt, sf, attrs))
            sys.stdout.flush()
