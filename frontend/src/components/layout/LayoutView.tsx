/**
 * LayoutView - Renders score using Feature 017 layout engine
 * 
 * Converts Score data to layout format and displays using LayoutRenderer
 */

import { useState, useEffect } from 'react';
import type { Score } from '../../types/score';
import { ScoreViewer } from '../../pages/ScoreViewer';
import type { GlobalLayout } from '../../wasm/layout';
import { computeLayout } from '../../wasm/layout';

interface LayoutViewProps {
  score: Score;
}

/**
 * Convert Score to format expected by computeLayout
 * For now, extracts first voice from first instrument
 */
function convertScoreToLayoutFormat(score: Score): any {
  // Start with first instrument
  const firstInstrument = score.instruments[0];
  if (!firstInstrument) {
    throw new Error('No instruments in score');
  }

  // Get first staff
  const firstStaff = firstInstrument.staves[0];
  if (!firstStaff) {
    throw new Error('No staves in instrument');
  }

  // Get first voice
  const firstVoice = firstStaff.voices[0];
  if (!firstVoice) {
    throw new Error('No voices in staff');
  }

  // For debugging: create a minimal score structure
  // This format needs to match what the Rust WASM expects
  return {
    instruments: [{
      id: firstInstrument.id,
      name: firstInstrument.name,
      staves: [{
        clef: firstStaff.active_clef,
        voices: [{
          notes: firstVoice.interval_events.map((note: any) => ({
            tick: note.start_tick,
            duration: note.duration_ticks,
            pitch: note.pitch,
            articulation: null,
          }))
        }]
      }]
    }],
    // Extract tempo and time signature from g global_structural_events
    tempo_changes: score.global_structural_events
      .filter((e: any) => 'Tempo' in e)
      .map((e: any) => e.Tempo),
    time_signature_changes: score.global_structural_events
      .filter((e: any) => 'TimeSignature' in e)
      .map((e: any) => e.TimeSignature),
  };
}

export function LayoutView({ score }: LayoutViewProps) {
  const [layout, setLayout] = useState<GlobalLayout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          max_system_width: 1200,
          system_height: 200,
          system_spacing: 220,
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
      <ScoreViewer layout={layout} />
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
