import { ScoreViewer } from './components/ScoreViewer'
import { FileStateProvider } from './services/state/FileStateContext'
import { TempoStateProvider } from './services/state/TempoStateContext'
import './App.css'

/**
 * Musicore - Music Score Editor
 * 
 * Main application component that renders the score viewer.
 * Connects to backend API at http://localhost:8080
 * 
 * Feature 008: Added TempoStateProvider for tempo change support
 */
function App() {
  return (
    <TempoStateProvider>
      <FileStateProvider>
        <div className="app">
          <header className="app-header">
            <h1>🎵 Musicore</h1>
            <p>Music Score Editor - Domain-Driven Design</p>
          </header>
          <main>
            <ScoreViewer />
          </main>
        </div>
      </FileStateProvider>
    </TempoStateProvider>
  )
}

export default App
