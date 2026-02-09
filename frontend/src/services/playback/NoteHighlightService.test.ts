import { describe, it, expect } from 'vitest';
import { NoteHighlightService } from './NoteHighlightService';
import type { Note } from '../../types/score';

describe('NoteHighlightService', () => {
  describe('getPlayingNoteIds', () => {
    it('should identify single note playing at current tick', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 0, duration_ticks: 100, pitch: 60, velocity: 80 },
        { id: 'note2', start_tick: 100, duration_ticks: 100, pitch: 62, velocity: 80 },
        { id: 'note3', start_tick: 200, duration_ticks: 100, pitch: 64, velocity: 80 },
      ];

      // At tick 50, only note1 should be playing (0-100)
      const result = NoteHighlightService.getPlayingNoteIds(notes, 50);
      expect(result).toEqual(['note1']);
    });

    it('should identify multiple simultaneous notes (chord)', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 0, duration_ticks: 200, pitch: 60, velocity: 80 },
        { id: 'note2', start_tick: 0, duration_ticks: 200, pitch: 64, velocity: 80 },
        { id: 'note3', start_tick: 0, duration_ticks: 200, pitch: 67, velocity: 80 },
        { id: 'note4', start_tick: 200, duration_ticks: 100, pitch: 72, velocity: 80 },
      ];

      // At tick 100, notes 1, 2, 3 should be playing (chord)
      const result = NoteHighlightService.getPlayingNoteIds(notes, 100);
      expect(result).toEqual(['note1', 'note2', 'note3']);
    });

    it('should apply minimum duration for very short notes', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 0, duration_ticks: 10, pitch: 60, velocity: 80 }, // Very short
        { id: 'note2', start_tick: 100, duration_ticks: 5, pitch: 62, velocity: 80 }, // Extremely short
      ];

      const minimumDuration = 50; // 50 ticks minimum

      // At tick 5 (within 10 ticks), but with minimum duration
      const result1 = NoteHighlightService.getPlayingNoteIds(notes, 5, minimumDuration);
      expect(result1).toEqual(['note1']); // Should be highlighted

      // At tick 45 (beyond original 10, but within minimum 50)
      const result2 = NoteHighlightService.getPlayingNoteIds(notes, 45, minimumDuration);
      expect(result2).toEqual(['note1']); // Still highlighted due to minimum

      // At tick 55 (beyond minimum duration)
      const result3 = NoteHighlightService.getPlayingNoteIds(notes, 55, minimumDuration);
      expect(result3).toEqual([]); // Not highlighted
    });

    it('should return empty array for tick before any notes', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 100, duration_ticks: 100, pitch: 60, velocity: 80 },
      ];

      const result = NoteHighlightService.getPlayingNoteIds(notes, 50);
      expect(result).toEqual([]);
    });

    it('should return empty array for tick after all notes', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 0, duration_ticks: 100, pitch: 60, velocity: 80 },
      ];

      const result = NoteHighlightService.getPlayingNoteIds(notes, 150);
      expect(result).toEqual([]);
    });

    it('should handle note at exact start tick', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 100, duration_ticks: 100, pitch: 60, velocity: 80 },
      ];

      const result = NoteHighlightService.getPlayingNoteIds(notes, 100);
      expect(result).toEqual(['note1']);
    });

    it('should handle note at exact end tick', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 100, duration_ticks: 100, pitch: 60, velocity: 80 },
      ];

      // At tick 199 (last tick of note: 100 + 100 - 1)
      const result = NoteHighlightService.getPlayingNoteIds(notes, 199);
      expect(result).toEqual(['note1']);

      // At tick 200 (just after note ends)
      const resultAfter = NoteHighlightService.getPlayingNoteIds(notes, 200);
      expect(resultAfter).toEqual([]);
    });

    it('should handle empty notes array', () => {
      const result = NoteHighlightService.getPlayingNoteIds([], 100);
      expect(result).toEqual([]);
    });

    it('should use default minimum duration of 0 ticks', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 0, duration_ticks: 10, pitch: 60, velocity: 80 },
      ];

      // Without minimum duration, note ends at tick 10
      const result = NoteHighlightService.getPlayingNoteIds(notes, 15);
      expect(result).toEqual([]);
    });
  });

  describe('getHighlightDetails', () => {
    it('should return highlight details with note IDs and map', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 0, duration_ticks: 100, pitch: 60, velocity: 80 },
        { id: 'note2', start_tick: 0, duration_ticks: 100, pitch: 64, velocity: 80 },
      ];

      const result = NoteHighlightService.getHighlightDetails(notes, 50);

      expect(result.playingNoteIds).toEqual(['note1', 'note2']);
      expect(result.highlightMap.size).toBe(2);
      expect(result.highlightMap.get('note1')).toEqual({
        noteId: 'note1',
        startTick: 0,
        endTick: 100,
        isPlaying: true,
      });
      expect(result.highlightMap.get('note2')).toEqual({
        noteId: 'note2',
        startTick: 0,
        endTick: 100,
        isPlaying: true,
      });
    });

    it('should return empty details when no notes are playing', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 100, duration_ticks: 100, pitch: 60, velocity: 80 },
      ];

      const result = NoteHighlightService.getHighlightDetails(notes, 50);

      expect(result.playingNoteIds).toEqual([]);
      expect(result.highlightMap.size).toBe(0);
    });

    it('should calculate correct end tick for each note', () => {
      const notes: Note[] = [
        { id: 'note1', start_tick: 100, duration_ticks: 50, pitch: 60, velocity: 80 },
      ];

      const result = NoteHighlightService.getHighlightDetails(notes, 120);

      expect(result.highlightMap.get('note1')?.endTick).toBe(150);
    });
  });
});
