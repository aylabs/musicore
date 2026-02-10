/**
 * LocalStorage Mock for Testing
 * 
 * Feature: 013-demo-onboarding
 * Provides a mock implementation of localStorage for unit tests
 */

class LocalStorageMock implements Storage {
  private store: Record<string, string> = {};
  
  get length(): number {
    return Object.keys(this.store).length;
  }
  
  clear(): void {
    this.store = {};
  }
  
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  
  removeItem(key: string): void {
    delete this.store[key];
  }
  
  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] ?? null;
  }
}

/**
 * Setup localStorage mock for tests
 * Call this in beforeEach or beforeAll in test files
 */
export function setupLocalStorageMock(): void {
  const localStorageMock = new LocalStorageMock();
  global.localStorage = localStorageMock as Storage;
}

/**
 * Reset localStorage mock
 * Call this in afterEach to ensure test isolation
 */
export function resetLocalStorageMock(): void {
  if (global.localStorage) {
    global.localStorage.clear();
  }
}

export { LocalStorageMock };
