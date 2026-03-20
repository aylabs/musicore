#!/usr/bin/env python3
import zipfile, xml.etree.ElementTree as ET, sys

z = zipfile.ZipFile("scores/Beethoven_FurElise.mxl")
data = z.read("score.xml")
z.close()
root = ET.fromstring(data)

for part in root.findall(".//part"):
    for m in part.findall("measure"):
        if m.get("number") in ("51", "52", "53"):
            sys.stdout.write("=== MEASURE %s ===\n" % m.get("number"))
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
                    notations = elem.find("notations")
                    slur_info = []
                    if notations is not None:
                        for sl in notations.findall("slur"):
                            slur_info.append("type=%s num=%s placement=%s" % (
                                sl.get("type", "?"), sl.get("number", "?"), sl.get("placement", "?")))
                    if r is not None:
                        vt = v.text if v is not None else "?"
                        sf = s.text if s is not None else "?"
                        sys.stdout.write("  REST v=%s s=%s\n" % (vt, sf))
                    else:
                        step = p.find("step").text
                        octave = p.find("octave").text
                        alter = p.find("alter")
                        av = alter.text if alter is not None else "0"
                        vt = v.text if v is not None else "?"
                        sf = s.text if s is not None else "?"
                        dt = d.text if d is not None else "?"
                        tt = t.text if t is not None else "?"
                        sd = st.text if st is not None else "none"
                        ic = "Y" if c is not None else "N"
                        sl_str = "; ".join(slur_info) if slur_info else ""
                        sys.stdout.write("  %s%s/%s chord=%s v=%s s=%s dur=%s type=%s stem=%s slurs=[%s]\n" % (
                            step, av, octave, ic, vt, sf, dt, tt, sd, sl_str))
                elif elem.tag == "backup":
                    dd = elem.find("duration")
                    sys.stdout.write("  BACKUP dur=%s\n" % (dd.text if dd is not None else "?"))
                elif elem.tag == "attributes":
                    for cc in elem.findall("clef"):
                        sgn = cc.find("sign")
                        ln = cc.find("line")
                        sn = cc.get("number", "?")
                        sys.stdout.write("  CLEF staff=%s sign=%s line=%s\n" % (
                            sn, sgn.text if sgn is not None else "?", ln.text if ln is not None else "?"))
            sys.stdout.flush()
