#!/usr/bin/env python3
import zipfile, xml.etree.ElementTree as ET

z = zipfile.ZipFile("scores/Beethoven_FurElise.mxl")
data = z.read("score.xml")
z.close()
root = ET.fromstring(data)

for part in root.findall(".//part"):
    for m in part.findall("measure"):
        if m.get("number") == "63":
            print("=== MEASURE 63 ===")
            for elem in m:
                if elem.tag == "note":
                    p = elem.find("pitch")
                    r = elem.find("rest")
                    v = elem.find("voice")
                    s = elem.find("staff")
                    dur = elem.find("duration")
                    ntype = elem.find("type")
                    chord = elem.find("chord")
                    dot_count = len(elem.findall("dot"))
                    stem = elem.find("stem")
                    stem_v = stem.text if stem is not None else "?"
                    if r is not None:
                        vt = v.text if v is not None else "?"
                        st = s.text if s is not None else "?"
                        dt = dur.text if dur is not None else "?"
                        nt = ntype.text if ntype is not None else "?"
                        print(f"  REST v={vt} s={st} dur={dt} type={nt}")
                    else:
                        step = p.find("step").text
                        octave = p.find("octave").text
                        alter = p.find("alter")
                        alter_v = alter.text if alter is not None else "0"
                        vt = v.text if v is not None else "?"
                        st = s.text if s is not None else "?"
                        dt = dur.text if dur is not None else "?"
                        nt = ntype.text if ntype is not None else "?"
                        ch = "Y" if chord is not None else "N"
                        print(f"  {step}{alter_v}/{octave} chord={ch} v={vt} s={st} dur={dt} type={nt} dots={dot_count} stem={stem_v}")
                elif elem.tag == "backup":
                    d = elem.find("duration")
                    print(f"  BACKUP dur={d.text}")
                elif elem.tag == "forward":
                    d = elem.find("duration")
                    print(f"  FORWARD dur={d.text}")
                elif elem.tag == "attributes":
                    clefs = elem.findall("clef")
                    for c in clefs:
                        sign = c.find("sign").text
                        line = c.find("line").text
                        staff_num = c.get("number", "?")
                        print(f"  CLEF staff={staff_num} sign={sign} line={line}")
