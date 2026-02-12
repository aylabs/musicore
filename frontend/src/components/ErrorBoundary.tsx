/**
 * ErrorBoundary Component
 * Feature 017 - Error handling for LayoutRenderer
 * 
 * Catches rendering errors and displays fallback UI
 * instead of crashing the entire application.
 */

import { Component, type ReactNode } from 'react';

/**
 * Props for ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error (if any) */
  error: Error | null;
  /** Error stack trace */
  errorInfo: string | null;
}

/**
 * ErrorBoundary component implementation (T070)
 * 
 * Wraps ScoreViewer/LayoutRenderer to catch rendering errors
 * and display a user-friendly fallback instead of crashing.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <ScoreViewer layout={layout} />
 * </ErrorBoundary>
 * ```
 * 
 * @example Custom fallback
 * ```tsx
 * <ErrorBoundary fallback={<div>Custom error message</div>}>
 *   <ScoreViewer layout={layout} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * React lifecycle: Catch errors during rendering
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  /**
   * React lifecycle: Log error details
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('LayoutRenderer Error:', error);
    console.error('Error Info:', errorInfo);
    this.setState({
      errorInfo: errorInfo.componentStack || 'No stack trace available',
    });
  }

  /**
   * Reset error state (allow retry)
   */
  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Render error UI or children
   */
  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={styles.heading}>⚠️ Rendering Error</h2>
            <p style={styles.message}>
              The score renderer encountered an error and cannot display the score.
            </p>
            <details style={styles.details}>
              <summary style={styles.summary}>Error Details</summary>
              <div style={styles.errorBox}>
                <p style={styles.errorName}>
                  <strong>Error:</strong> {error?.message || 'Unknown error'}
                </p>
                {errorInfo && (
                  <pre style={styles.stackTrace}>{errorInfo}</pre>
                )}
              </div>
            </details>
            <button onClick={this.handleReset} style={styles.button}>
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Inline styles for ErrorBoundary
 */
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '20px',
    backgroundColor: '#F5F5F5',
  },
  card: {
    maxWidth: '600px',
    padding: '24px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  heading: {
    margin: '0 0 16px 0',
    fontSize: '24px',
    fontWeight: 'bold' as const,
    color: '#D32F2F',
  },
  message: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    color: '#666666',
    lineHeight: '1.5',
  },
  details: {
    marginBottom: '20px',
  },
  summary: {
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#1976D2',
    marginBottom: '8px',
  },
  errorBox: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#FFF8E1',
    borderLeft: '4px solid #FFA000',
    borderRadius: '4px',
  },
  errorName: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#333333',
  },
  stackTrace: {
    margin: 0,
    padding: '8px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#666666',
    backgroundColor: '#F5F5F5',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '200px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    backgroundColor: '#1976D2',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};
