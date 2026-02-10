import { useState, useEffect } from 'react'
import { ScoreViewer } from './components/ScoreViewer'
import { OfflineBanner } from './components/OfflineBanner'
import { IOSInstallModal } from './components/IOSInstallModal'
import { FileStateProvider } from './services/state/FileStateContext'
import { TempoStateProvider } from './services/state/TempoStateContext'
import { initWasm } from './services/wasm/loader'
import { useOnboarding } from './hooks/useOnboarding'
import './App.css'

/**
 * Musicore - Music Score Editor
 * 
 * Main application component that renders the score viewer.
 * Connects to backend API at http://localhost:8080
 * 
 * Feature 008: Added TempoStateProvider for tempo change support
 * Feature 011: Added WASM music engine initialization
 * Feature 013: Added onboarding with demo music on first run
 */
function App() {
  const [wasmLoading, setWasmLoading] = useState(true)
  const [wasmError, setWasmError] = useState<string | null>(null)
  
  // Feature 013: Onboarding hook for first-run demo and view mode preference
  const { viewMode, setViewMode, isDemoLoading, demoError, demoScoreId } = useOnboarding()

  useEffect(() => {
    // Initialize WASM module on app startup
    initWasm()
      .then(() => {
        console.log('[App] WASM engine ready')
        setWasmLoading(false)
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('[App] WASM initialization failed:', errorMessage)
        setWasmError(errorMessage)
        setWasmLoading(false)
      })
  }, [])

  // Show loading state while WASM initializes or demo loads on first run
  if (wasmLoading || isDemoLoading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>🎵 Musicore</h1>
        </header>
        <main style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '2rem' }}>🎼</div>
          <p>{isDemoLoading ? 'Loading demo music...' : 'Loading music engine...'}</p>
        </main>
      </div>
    )
  }

  // Show error state if WASM fails to initialize
  if (wasmError) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>🎵 Musicore</h1>
        </header>
        <main style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh',
          flexDirection: 'column',
          gap: '1rem',
          padding: '2rem'
        }}>
          <div style={{ fontSize: '2rem', color: '#f44336' }}>⚠️</div>
          <h2>Failed to Initialize Music Engine</h2>
          <p style={{ maxWidth: '600px', textAlign: 'center' }}>
            Your browser may not support WebAssembly, or there was an error loading the music engine.
          </p>
          <details style={{ maxWidth: '600px', marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details</summary>
            <pre style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              background: '#f5f5f5', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.875rem',
              textAlign: 'left'
            }}>
              {wasmError}
            </pre>
          </details>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
            Try using a modern browser like Chrome, Firefox, Safari, or Edge.
          </p>
        </main>
      </div>
    )
  }

  // Normal app render once WASM is ready
  return (
    <TempoStateProvider>
      <FileStateProvider>
        <div className="app">
          <OfflineBanner />
          {/* Feature 013: Demo loading error notification (T019) */}
          {demoError && (
            <div style={{
              position: 'fixed',
              top: '4rem',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#ff9800',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              zIndex: 1000,
              maxWidth: '600px',
              textAlign: 'center'
            }}>
              ⚠️ Demo music unavailable. You can import your own MusicXML files.
            </div>
          )}
          <header className="app-header">
            <h1>🎵 Musicore</h1>
          </header>
          <main>
            <ScoreViewer 
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </main>
          <IOSInstallModal />
        </div>
      </FileStateProvider>
    </TempoStateProvider>
  )
}

export default App

