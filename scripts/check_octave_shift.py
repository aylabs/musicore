import zipfile, re, os

scores_dir = os.path.join(os.path.dirname(__file__), '..', 'scores')
scores = ['Burgmuller_LaCandeur', 'Burgmuller_Arabesque', 'Pachelbel_CanonD', 'Bach_InventionNo1', 'Beethoven_FurElise', 'Chopin_NocturneOp9No2']

for score in scores:
    path = os.path.join(scores_dir, f'{score}.mxl')
    try:
        with zipfile.ZipFile(path) as z:
            for name in z.namelist():
                if name.endswith('.xml') and 'META' not in name:
                    content = z.read(name).decode('utf-8')
                    count = len(re.findall('octave-shift', content))
                    if count > 0:
                        print(f'{score}: {count} octave-shift elements')
                    else:
                        print(f'{score}: no octave-shift')
    except Exception as e:
        print(f'{score}: {e}')
