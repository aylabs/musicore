import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReloadGuard } from '../../src/components/ReloadGuard';
import * as offlineDetection from '../../src/hooks/useOfflineDetection';

describe('ReloadGuard', () => {
  let mockUseOfflineDetection: ReturnType<typeof vi.fn>;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock useOfflineDetection hook
    mockUseOfflineDetection = vi.fn();
    vi.spyOn(offlineDetection, 'useOfflineDetection').mockImplementation(mockUseOfflineDetection);

    // Spy on window event listeners
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Online behavior', () => {
    it('should not add beforeunload listener when online', () => {
      mockUseOfflineDetection.mockReturnValue(false); // Online = false

      render(<ReloadGuard />);

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });

    it('should render nothing (null)', () => {
      mockUseOfflineDetection.mockReturnValue(false);

      const { container } = render(<ReloadGuard />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Offline behavior', () => {
    beforeEach(() => {
      mockUseOfflineDetection.mockReturnValue(true); // Offline = true
    });

    it('should add beforeunload warning when offline and no service worker', () => {
      // Mock no service worker installed
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { controller: null },
        writable: true,
        configurable: true,
      });

      render(<ReloadGuard />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });

    it('should NOT add warning when offline but service worker is active', () => {
      // Mock active service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { controller: {} }, // Non-null means SW is active
        writable: true,
        configurable: true,
      });

      render(<ReloadGuard />);

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });

    it('should cleanup beforeunload listener on unmount', () => {
      // Mock no service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { controller: null },
        writable: true,
        configurable: true,
      });

      const { unmount } = render(<ReloadGuard />);

      const addCalls = addEventListenerSpy.mock.calls;
      const beforeunloadCall = addCalls.find(call => call[0] === 'beforeunload');
      
      expect(beforeunloadCall).toBeDefined();

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        beforeunloadCall![1]
      );
    });
  });

  describe('Online/offline transitions', () => {
    it('should remove warning when going from offline to online', () => {
      // Start offline
      mockUseOfflineDetection.mockReturnValue(true);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { controller: null },
        writable: true,
        configurable: true,
      });

      const { rerender } = render(<ReloadGuard />);

      const addCalls = addEventListenerSpy.mock.calls;
      const beforeunloadCall = addCalls.find(call => call[0] === 'beforeunload');
      expect(beforeunloadCall).toBeDefined();

      // Go online
      mockUseOfflineDetection.mockReturnValue(false);
      rerender(<ReloadGuard />);

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        beforeunloadCall![1]
      );
    });
  });
});
