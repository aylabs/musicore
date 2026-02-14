#!/usr/bin/env python3
"""Generate 100-measure fixture by duplicating 50-measure fixture"""

import json

# Load 50-measure fixture
with open('piano_50_measures.json', 'r') as f:
    score = json.load(f)

# Double the measures to create 100-measure fixture
if 'instruments' in score and len(score['instruments']) > 0:
    for instrument in score['instruments']:
        if 'staves' in instrument:
            for staff in instrument['staves']:
                if 'voices' in staff:
                    for voice in staff['voices']:
                        if 'interval_events' in voice:
                            # Duplicate notes with tick offsets
                            original_notes = voice['interval_events'].copy()
                            max_tick = max(note['start_tick']['value'] for note in original_notes) + 7680  # Add offset after last measure
                            
                            #Add duplicated notes with tick shift
                            for note in original_notes:
                                new_note = json.loads(json.dumps(note))  # Deep copy
                                new_note['start_tick']['value'] += max_tick
                                voice['interval_events'].append(new_note)

# Write 100-measure fixture
with open('piano_100_measures.json', 'w') as f:
    json.dump(score, f, indent=2)

print('Created piano_100_measures.json with', 
      len(score['instruments'][0]['staves'][0]['voices'][0]['interval_events']), 'notes')
