/**
 * Unit tests for MidiDetectionDialog component.
 *
 * T019 (Phase 5, US3, parallel).
 *
 * TDD: Written BEFORE implementation — must FAIL until MidiDetectionDialog.tsx is created.
 * Run: npx vitest run src/components/recording/MidiDetectionDialog.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MidiDetectionDialog } from './MidiDetectionDialog';
import type { MidiDevice } from '../../types/recording';

const DEVICE_A: MidiDevice = { id: 'a', name: 'Piano', manufacturer: 'Arturia', state: 'connected' };
const DEVICE_B: MidiDevice = { id: 'b', name: 'Keyboard', manufacturer: 'Yamaha', state: 'connected' };

describe('T019 — MidiDetectionDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the device name in the dialog', () => {
    render(
      <MidiDetectionDialog
        devices={[DEVICE_A]}
        onSwitch={vi.fn()}
        onKeep={vi.fn()}
      />
    );
    expect(screen.getByText(/Piano/i)).toBeInTheDocument();
  });

  it('renders a visible countdown starting at 30 by default', () => {
    render(
      <MidiDetectionDialog
        devices={[DEVICE_A]}
        onSwitch={vi.fn()}
        onKeep={vi.fn()}
      />
    );
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it('renders a visible countdown starting at the countdownSeconds prop', () => {
    render(
      <MidiDetectionDialog
        devices={[DEVICE_A]}
        onSwitch={vi.fn()}
        onKeep={vi.fn()}
        countdownSeconds={10}
      />
    );
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('countdown decrements each second', async () => {
    render(
      <MidiDetectionDialog
        devices={[DEVICE_A]}
        onSwitch={vi.fn()}
        onKeep={vi.fn()}
        countdownSeconds={5}
      />
    );

    expect(screen.getByText(/5/)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText(/4/)).toBeInTheDocument();
  });

  it('clicking "Keep Microphone" calls onKeep', () => {
    const onKeep = vi.fn();
    render(
      <MidiDetectionDialog
        devices={[DEVICE_A]}
        onSwitch={vi.fn()}
        onKeep={onKeep}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Keep Microphone/i }));
    expect(onKeep).toHaveBeenCalledOnce();
  });

  it('clicking "Switch to MIDI" calls onSwitch with the device', () => {
    const onSwitch = vi.fn();
    render(
      <MidiDetectionDialog
        devices={[DEVICE_A]}
        onSwitch={onSwitch}
        onKeep={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Switch to MIDI/i }));
    expect(onSwitch).toHaveBeenCalledOnce();
    expect(onSwitch).toHaveBeenCalledWith(DEVICE_A);
  });

  it('countdown reaching 0 calls onKeep (auto-dismiss)', async () => {
    const onKeep = vi.fn();
    render(
      <MidiDetectionDialog
        devices={[DEVICE_A]}
        onSwitch={vi.fn()}
        onKeep={onKeep}
        countdownSeconds={3}
      />
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(onKeep).toHaveBeenCalledOnce();
  });

  it('Escape key press calls onKeep', () => {
    const onKeep = vi.fn();
    render(
      <MidiDetectionDialog
        devices={[DEVICE_A]}
        onSwitch={vi.fn()}
        onKeep={onKeep}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(onKeep).toHaveBeenCalledOnce();
  });

  it('lists multiple devices with the first one pre-selected/shown first', () => {
    render(
      <MidiDetectionDialog
        devices={[DEVICE_A, DEVICE_B]}
        onSwitch={vi.fn()}
        onKeep={vi.fn()}
      />
    );
    expect(screen.getByText(/Piano/i)).toBeInTheDocument();
    expect(screen.getByText(/Keyboard/i)).toBeInTheDocument();
  });

  it('clearInterval is called on unmount (no timers leak)', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = render(
      <MidiDetectionDialog
        devices={[DEVICE_A]}
        onSwitch={vi.fn()}
        onKeep={vi.fn()}
      />
    );
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
