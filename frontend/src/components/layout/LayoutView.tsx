/**
 * LayoutView - Renders score using Feature 017 layout engine
 * 
 * Converts Score data to layout format and displays using LayoutRenderer
 */

import { useState, useEffect, useMemo } from 'react';
import type { Score, GlobalStructuralEvent, StaffStructuralEvent, Note } from '../../types/score';
import { ScoreViewer } from '../../pages/ScoreViewer';
import type { GlobalLayout } from '../../wasm/layout';
import { computeLayout } from '../../wasm/layout';
import { buildSourceToNoteIdMap } from '../../services/highlight/sourceMapping';

interface ConvertedScore {
  instruments: Array<{
    id: string;
    name: string;
    staves: Array<{
      clef: string;
      time_signature: { numerator: number; denominator: number };
      key_signature: { sharps: number };
      voices: Array<{
        notes: Array<{
          tick: number;
          duration: number;
          pitch: number;
          articulation: null;
        }>;
      }>;
    }>;
  }>;
  tempo_changes: unknown[];
  time_signature_changes: unknown[];
}

interface LayoutViewProps {
  score: Score;
  /** Feature 019: Set of note IDs to highlight during playback */
  highlightedNoteIds?: Set<string>;
  /** Toggle playback on click/touch */
  onTogglePlayback?: () => void;
}

/**
 * Convert Score to format expected by computeLayout
 * Processes all staves from first instrument (needed for piano grand staff)
 */
function convertScoreToLayoutFormat(score: Score): ConvertedScore {
  // Start with first instrument
  const firstInstrument = score.instruments[0];
  if (!firstInstrument) {
    throw new Error('No instruments in score');
  }

  // Extract time signature from global structural events (default to 4/4)
  let timeSignature = { numerator: 4, denominator: 4 };
  const firstTimeSigEvent = score.global_structural_events.find((e: GlobalStructuralEvent) => 'TimeSignature' in e);
  if (firstTimeSigEvent && 'TimeSignature' in firstTimeSigEvent) {
    const timeSig = firstTimeSigEvent.TimeSignature;
    timeSignature = {
      numerator: timeSig.numerator,
      denominator: timeSig.denominator,
    };
  }

  // Process all staves from the instrument (piano has 2: treble + bass)
  const convertedStaves = firstInstrument.staves.map(staff => {
    // Get first voice from this staff
    const firstVoice = staff.voices[0];
    if (!firstVoice) {
      throw new Error('No voices in staff');
    }

    // Extract key signature from staff structural events (default to 0 = C major)
    let keySharps = 0;
    const firstKeySigEvent = staff.staff_structural_events.find((e: StaffStructuralEvent) => 'KeySignature' in e);
    if (firstKeySigEvent && 'KeySignature' in firstKeySigEvent) {
      const keySig = firstKeySigEvent.KeySignature.key;
      // Map key signature enum to number of sharps/flats
      const keyMap: { [key: string]: number } = {
        'CMajor': 0, 'AMinor': 0,
        'GMajor': 1, 'EMinor': 1,
        'DMajor': 2, 'BMinor': 2,
        'AMajor': 3, 'FSharpMinor': 3,
        'EMajor': 4, 'CSharpMinor': 4,
        'BMajor': 5, 'GSharpMinor': 5,
        'FSharpMajor': 6, 'DSharpMinor': 6,
        'CSharpMajor': 7, 'ASharpMinor': 7,
        'FMajor': -1, 'DMinor': -1,
        'BFlatMajor': -2, 'GMinor': -2,
        'EFlatMajor': -3, 'CMinor': -3,
        'AFlatMajor': -4, 'FMinor': -4,
        'DFlatMajor': -5, 'BFlatMinor': -5,
        'GFlatMajor': -6, 'EFlatMinor': -6,
        'CFlatMajor': -7, 'AFlatMinor': -7,
      };
      keySharps = keyMap[keySig] || 0;
    }

    return {
      clef: staff.active_clef,
      time_signature: timeSignature,
      key_signature: { sharps: keySharps },
      voices: [{
        notes: firstVoice.interval_events.map((note: Note) => ({
          tick: note.start_tick,
          duration: note.duration_ticks,
          pitch: note.pitch,
          articulation: null,
        }))
      }]
    };
  });

  // Create score structure matching Rust WASM expectations
  return {
    instruments: [{
      id: firstInstrument.id,
      name: firstInstrument.name,
      staves: convertedStaves
    }],
    // Extract tempo and time signature from global_structural_events
    tempo_changes: score.global_structural_events
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((e): e is any => 'Tempo' in e)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e: any) => e.Tempo),
    time_signature_changes: score.global_structural_events
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((e): e is any => 'TimeSignature' in e)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e: any) => e.TimeSignature),
  };
}

export function LayoutView({ score, highlightedNoteIds, onTogglePlayback }: LayoutViewProps) {
  const [layout, setLayout] = useState<GlobalLayout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Feature 019: Build mapping from layout source references to note IDs
   * Must use layout's instrument_ids (not score's) to match glyph source_references
   */
  const sourceToNoteIdMap = useMemo(() => {
    return buildSourceToNoteIdMap(score, layout);
  }, [score, layout]);

  useEffect(() => {
    const computeAndSetLayout = async () => {
      try {
        setLoading(true);
        setError(null);

        // Convert score to layout format
        const layoutInput = convertScoreToLayoutFormat(score);
        
        console.log('[LayoutView] Converting score to layout:', {
          originalScore: score,
          layoutInput,
          firstInstrument: score.instruments[0],
          firstStaff: score.instruments[0]?.staves[0],
          firstVoice: score.instruments[0]?.staves[0]?.voices[0],
          firstNotes: score.instruments[0]?.staves[0]?.voices[0]?.interval_events?.slice(0, 3),
        });

        // Compute layout with complete config (now async)
        const result = await computeLayout(layoutInput, {
          max_system_width: 2400,
          system_height: 200,
          system_spacing: 300,
          units_per_space: 20, // 20 logical units = 1 staff space
        });

        // Check if staff_groups are populated
        if (result.systems?.length > 0 && result.systems[0].staff_groups.length === 0) {
          throw new Error('Layout engine computed systems but did not generate staff content (staff lines, glyphs, etc.). The Rust layout engine needs additional implementation to convert notes into positioned glyphs.');
        }
        
        setLayout(result);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[LayoutView] Failed to compute layout:', errorMessage, err);
        setError(errorMessage);
        setLoading(false);
      }
    };

    computeAndSetLayout();
  }, [score]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.message}>
          <div style={styles.spinner}>🎼</div>
          <p>Computing layout from first voice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>⚠️ Layout Error</h3>
          <p>{error}</p>
          <details style={{ marginTop: '1rem', textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer' }}>Debug Info</summary>
            <pre style={styles.debug}>
              {JSON.stringify({ score, error }, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  if (!layout) {
    return (
      <div style={styles.container}>
        <div style={styles.message}>
          <p>No layout available</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.info}>
        📐 Layout View: First voice from {score.instruments[0]?.name || 'instrument'}
      </div>
      <ScoreViewer 
        layout={layout} 
        initialZoom={0.5}
        highlightedNoteIds={highlightedNoteIds}
        sourceToNoteIdMap={sourceToNoteIdMap}
        onTogglePlayback={onTogglePlayback}
      />
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  message: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    height: '60vh',
    color: '#666',
  },
  spinner: {
    fontSize: '3rem',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  error: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    height: '60vh',
    color: '#f44336',
    padding: '2rem',
  },
  debug: {
    background: '#f5f5f5',
    padding: '1rem',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '300px',
    fontSize: '0.875rem',
  },
  info: {
    padding: '0.75rem 1rem',
    backgroundColor: '#e3f2fd',
    borderBottom: '1px solid #90caf9',
    fontSize: '0.875rem',
    fontWeight: 'bold' as const,
    color: '#1976d2',
  },
};
