import React, { createContext, useContext, useState, useCallback } from 'react';
import type { FileState } from '../../types/file';

/**
 * Context value interface for file state management
 */
interface FileStateContextValue {
  fileState: FileState;
  setFilePath: (path: string | null) => void;
  setModified: (modified: boolean) => void;
  resetFileState: () => void;
}

/**
 * Context for managing file state (current file path, modified flag, last saved timestamp)
 */
const FileStateContext = createContext<FileStateContextValue | undefined>(undefined);

/**
 * Initial file state for new unsaved scores
 */
const initialFileState: FileState = {
  currentFilePath: null,
  isModified: false,
  lastSavedTimestamp: null,
};

/**
 * Provider component for file state context
 * 
 * @example
 * ```tsx
 * <FileStateProvider>
 *   <App />
 * </FileStateProvider>
 * ```
 */
export const FileStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fileState, setFileState] = useState<FileState>(initialFileState);

  /**
   * Set the current file path and update timestamp
   * Called after successful save or load operations
   * Automatically sets isModified to false and updates lastSavedTimestamp
   * 
   * @param path - File path or null for unsaved scores
   */
  const setFilePath = useCallback((path: string | null) => {
    setFileState({
      currentFilePath: path,
      isModified: false,
      lastSavedTimestamp: Date.now(),
    });
  }, []);

  /**
   * Set the modified flag
   * Called when user edits the score or after save operations
   * 
   * @param modified - True if score has unsaved changes, false otherwise
   */
  const setModified = useCallback((modified: boolean) => {
    setFileState((prev) => ({
      ...prev,
      isModified: modified,
    }));
  }, []);

  /**
   * Reset file state to initial values (new unsaved score)
   * Called when user creates a new score
   */
  const resetFileState = useCallback(() => {
    setFileState(initialFileState);
  }, []);

  const value: FileStateContextValue = {
    fileState,
    setFilePath,
    setModified,
    resetFileState,
  };

  return (
    <FileStateContext.Provider value={value}>
      {children}
    </FileStateContext.Provider>
  );
};

/**
 * Hook to access file state context
 * Must be used within a FileStateProvider
 * 
 * @throws Error if used outside FileStateProvider
 * @returns File state and actions
 * 
 * @example
 * ```tsx
 * const { fileState, setFilePath, setModified, resetFileState } = useFileState();
 * 
 * // After saving a file
 * setFilePath('/path/to/my-score.musicore.json');
 * 
 * // After user edits the score
 * setModified(true);
 * 
 * // When creating a new score
 * if (fileState.isModified) {
 *   // Show warning dialog
 * }
 * resetFileState();
 * ```
 */
export const useFileState = (): FileStateContextValue => {
  const context = useContext(FileStateContext);
  if (!context) {
    throw new Error('useFileState must be used within a FileStateProvider');
  }
  return context;
};
