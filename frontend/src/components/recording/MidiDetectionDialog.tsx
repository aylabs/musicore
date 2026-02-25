/**
 * MidiDetectionDialog — modal dialog shown when a MIDI device connects during mic session.
 *
 * T022 (Phase 5, US3 implementation).
 *
 * Offers "Switch to MIDI" and "Keep Microphone".
 * Auto-dismisses after countdownSeconds (default 30) → calls onKeep.
 * Escape key also calls onKeep.
 *
 * Feature: 029-midi-input
 */

import { useEffect, useRef, useState } from 'react';
import type { MidiDevice } from '../../types/recording';

const DEFAULT_COUNTDOWN = 30;

export interface MidiDetectionDialogProps {
  /** Detected MIDI devices to display in the dialog */
  devices: MidiDevice[];
  /** Called with 'switch' when user selects "Switch to MIDI" */
  onSwitch: (device: MidiDevice) => void;
  /** Called when user selects "Keep Microphone", presses Escape, or countdown expires */
  onKeep: () => void;
  /** Auto-dismiss countdown in seconds (default: 30) */
  countdownSeconds?: number;
}

export function MidiDetectionDialog({
  devices,
  onSwitch,
  onKeep,
  countdownSeconds = DEFAULT_COUNTDOWN,
}: MidiDetectionDialogProps) {
  const [remaining, setRemaining] = useState(countdownSeconds);
  // Use a ref to hold onKeep to avoid stale closure in the interval
  const onKeepRef = useRef(onKeep);
  useEffect(() => {
    onKeepRef.current = onKeep;
  });

  // Countdown interval
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onKeepRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []); // mount-only

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onKeepRef.current();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const primaryDevice = devices[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="MIDI device detected"
      className="recording-view__midi-dialog-backdrop"
    >
      <div className="recording-view__midi-dialog">
        <h2 className="recording-view__midi-dialog__title">MIDI Device Detected</h2>

        <p className="recording-view__midi-dialog__body">
          {devices.length === 1
            ? `"${primaryDevice.name}" is connected.`
            : `${devices.length} MIDI devices connected:`}
        </p>

        {devices.length > 1 && (
          <ul className="recording-view__midi-dialog__device-list">
            {devices.map((d) => (
              <li key={d.id}>{d.name}</li>
            ))}
          </ul>
        )}

        <p className="recording-view__midi-dialog__countdown">
          Auto-dismissing in <strong>{remaining}</strong>s…
        </p>

        <button
          className="recording-view__midi-dialog__switch-btn"
          onClick={() => onSwitch(primaryDevice)}
          aria-label="Switch to MIDI"
        >
          Switch to MIDI
        </button>

        <button
          className="recording-view__midi-dialog__keep-btn"
          onClick={onKeep}
          aria-label="Keep Microphone"
        >
          Keep Microphone
        </button>
      </div>
    </div>
  );
}
