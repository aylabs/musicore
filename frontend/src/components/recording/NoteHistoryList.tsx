/**
 * NoteHistoryList — scrollable bounded list of detected note onsets
 *
 * US5: Shows each note onset with its label and elapsed time.
 * Auto-scrolls to the newest entry. Bounded at 200 entries (hook-side cap).
 * "Clear" button empties the list. Placeholder shown when empty.
 *
 * T028: Core component
 * T029: Wired into RecordingView
 */
import { useEffect, useRef } from 'react';
import type { NoteOnset } from '../../types/recording';

interface NoteHistoryListProps {
  entries: NoteOnset[];
  onClear: () => void;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function NoteHistoryList({ entries, onClear }: NoteHistoryListProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // Auto-scroll to newest entry
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="note-history-list">
      <div className="note-history-list__header">
        <span className="note-history-list__title">Note History</span>
        <button
          className="note-history-list__clear-btn"
          onClick={onClear}
          aria-label="Clear note history"
        >
          Clear
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="note-history-list__empty" aria-label="No notes recorded">
          No notes recorded yet
        </p>
      ) : (
        <ul
          ref={listRef}
          className="note-history-list__list"
          aria-label="Note history"
        >
          {entries.map((entry, idx) => (
            <li key={idx} className="note-history-list__entry">
              <span className="note-history-list__entry-label">{entry.label}</span>
              <span className="note-history-list__entry-time">{formatElapsed(entry.elapsedMs)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
