import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Polyfill for ImageData (needed for canvas-based tests)
if (typeof ImageData === 'undefined') {
  global.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(width: number, height: number);
    constructor(data: Uint8ClampedArray, width: number, height?: number);
    constructor(
      dataOrWidth: Uint8ClampedArray | number,
      widthOrHeight: number,
      height?: number
    ) {
      if (typeof dataOrWidth === 'number') {
        // new ImageData(width, height)
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        // new ImageData(data, width, height?)
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height ?? Math.floor(this.data.length / (this.width * 4));
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

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
