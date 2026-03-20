#!/usr/bin/env python3
import zipfile
import xml.etree.ElementTree as ET

with zipfile.ZipFile("scores/Beethoven_FurElise.mxl") as z:
    for name in z.namelist():
        if name.endswith(".xml"):
            xml_file = name
            break
    data = z.read(xml_file)

root = ET.fromstring(data)

for part in root.findall(".//part"):
    for measure in part.findall("measure"):
        num = measure.get("number")
        # Print first few notes of each measure
        notes = []
        for elem in measure:
            if elem.tag == "note":
                pitch = elem.find("pitch")
                if pitch is not None:
                    step = pitch.find("step").text
                    octave = pitch.find("octave").text
                    chord = elem.find("chord") is not None
                    notes.append(f"{step}{octave}{'*' if chord else ''}")
        if notes:
            print(f"  M{num}: {', '.join(notes[:6])}{'...' if len(notes)>6 else ''}")
        else:
            print(f"  M{num}: (rests only)")
