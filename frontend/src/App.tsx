import { ScoreViewer } from './components/ScoreViewer'
import { FileStateProvider } from './services/state/FileStateContext'
import './App.css'

/**
 * Musicore - Music Score Editor
 * 
 * Main application component that renders the score viewer.
 * Connects to backend API at http://localhost:8080
 */
function App() {
  return (
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
  )
}

export default App
