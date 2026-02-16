/**
 * Time Formatting Utilities
 *
 * Feature 022 - Display Improvements: User Story 1 (Playback Timer)
 * Pure functions for converting seconds to human-readable time strings.
 */

/**
 * Formats a duration in seconds to a human-readable time string.
 *
 * @param seconds - Non-negative number of seconds
 * @returns Formatted string:
 *   - "M:SS" for durations < 10 minutes (e.g., "0:00", "3:45", "9:59")
 *   - "MM:SS" for durations 10-59 minutes (e.g., "12:30", "59:59")
 *   - "H:MM:SS" for durations >= 1 hour (e.g., "1:05:30", "12:00:00")
 *
 * @example
 * formatPlaybackTime(0)      // "0:00"
 * formatPlaybackTime(65)     // "1:05"
 * formatPlaybackTime(605)    // "10:05"
 * formatPlaybackTime(3725)   // "1:02:05"
 */
export function formatPlaybackTime(seconds: number): string {
  // Clamp negative values to 0
  const totalSeconds = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const paddedSecs = secs.toString().padStart(2, '0');

  if (hours > 0) {
    const paddedMins = minutes.toString().padStart(2, '0');
    return `${hours}:${paddedMins}:${paddedSecs}`;
  }

  return `${minutes}:${paddedSecs}`;
}
