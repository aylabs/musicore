import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock Tone.js to avoid module resolution issues in tests
vi.mock('tone', () => ({
  default: {},
  Sampler: vi.fn(),
  Transport: {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    cancel: vi.fn(),
    schedule: vi.fn(),
    seconds: 0,
  },
  now: vi.fn(() => 0),
  context: {
    resume: vi.fn().mockResolvedValue(undefined),
  },
}));

// Cleanup after each test case
afterEach(() => {
  cleanup();
});
