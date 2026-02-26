import { useState, useEffect, useCallback, useRef } from 'react'
import { ScoreViewer } from './components/ScoreViewer'
import { RendererDemo } from './pages/RendererDemo'
import { RecordingView } from './components/recording/RecordingView'
import { PracticeView } from './components/practice/PracticeView'
import { OfflineBanner } from './components/OfflineBanner'
import { IOSInstallModal } from './components/IOSInstallModal'
import { FileStateProvider } from './services/state/FileStateContext'
import { TempoStateProvider } from './services/state/TempoStateContext'
import { initWasm } from './services/wasm/loader'
import { BUILTIN_PLUGINS, type BuiltinPluginEntry } from './services/plugins/builtinPlugins'
import { pluginRegistry } from './services/plugins/PluginRegistry'
import { PluginView } from './components/plugins/PluginView'
import { PluginNavEntry } from './components/plugins/PluginNavEntry'
import { PluginImporterDialog } from './components/plugins/PluginImporterDialog'
import type { PluginContext, PluginManifest, PluginNoteEvent } from './plugin-api/index'
import { PluginStaffViewer } from './plugin-api/PluginStaffViewer'
import { ToneAdapter } from './services/playback/ToneAdapter'
import { useMidiInput } from './services/recording/useMidiInput'
import packageJson from '../package.json'
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
 * Feature 017: Added RendererDemo route (access with ?demo=true)
 */
function App() {
  const [wasmLoading, setWasmLoading] = useState(true)
  const [wasmError, setWasmError] = useState<string | null>(null)
  
  // Feature 017: Check URL for demo mode (?demo=true)
  const [showDemo, setShowDemo] = useState(false)

  // Feature 001-recording-view: Recording debug view (?debug=true)
  const [showRecording, setShowRecording] = useState(false)
  // Feature 001-piano-practice: Practice debug view (?debug=true)
  const [showPractice, setShowPractice] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  // Feature 030: Plugin navigation state
  const [allPlugins, setAllPlugins] = useState<BuiltinPluginEntry[]>([])
  const [activePlugin, setActivePlugin] = useState<string | null>(null)
  // T025: Show/hide plugin importer dialog
  const [showImporter, setShowImporter] = useState(false)

  // Feature 030 / 029: Fan out MIDI hardware events to all subscribed plugins.
  // A single Set of handlers is shared; each plugin context adds/removes its own.
  const midiPluginSubscribersRef = useRef<Set<(e: PluginNoteEvent) => void>>(new Set())
  useMidiInput({
    onNoteOn: (midiEvent) => {
      const event: PluginNoteEvent = {
        midiNote: midiEvent.noteNumber,
        timestamp: Date.now(),
        velocity: midiEvent.velocity,
        type: 'attack',
      }
      midiPluginSubscribersRef.current.forEach(h => h(event))
    },
    onNoteOff: (noteNumber) => {
      const event: PluginNoteEvent = {
        midiNote: noteNumber,
        timestamp: Date.now(),
        type: 'release',
      }
      midiPluginSubscribersRef.current.forEach(h => h(event))
    },
    onConnectionChange: () => {},
  })
  
  // Mobile debug console (eruda) - enable with ?debug=true
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
      import('eruda').then(eruda => {
        eruda.default.init();
        console.log('[App] Eruda mobile debug console initialized');
        console.log('[App] Access console by tapping the floating button');
      });
    }
    
    // Feature 017: Check for demo mode
    if (urlParams.get('demo') === 'true') {
      console.log('[App] Demo mode enabled - showing RendererDemo');
      setShowDemo(true);
    }

    // Feature 001-recording-view: Enable debug mode flag for Record View button
    if (urlParams.get('debug') === 'true') {
      setDebugMode(true);
    }
  }, []);
  
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

  // Feature 030: Load plugins (builtins + persisted imported plugins) and call init()
  useEffect(() => {
    async function loadPlugins() {
      // Start with built-in plugins (always available, no IndexedDB needed)
      const entries: BuiltinPluginEntry[] = [...BUILTIN_PLUGINS]

      // Merge persisted imported plugins with placeholder components
      try {
        const imported = await pluginRegistry.list()
        for (const { manifest } of imported) {
          const pluginName = manifest.name
          entries.push({
            manifest: manifest,
            plugin: {
              init: () => {},
              dispose: () => {},
              Component: () => (
                <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                  <p>&#x1F4E6; "{pluginName}" is installed.</p>
                  <p style={{ fontSize: '0.8em' }}>Reload the app to activate imported plugins.</p>
                </div>
              ),
            },
          })
        }
        if (imported.length > 0) {
          console.log('[App] Merged', imported.length, 'imported plugin(s) from registry')
        }
      } catch (err) {
        console.warn('[App] Could not load plugin registry:', err)
      }

      // Initialise each plugin with a PluginContext
      entries.forEach(({ manifest, plugin }) => {
        const context: PluginContext = {
          emitNote: (event) => {
            // Note events are handled inside the plugin's own view for US1.
            // Future: wire to WASM layout pipeline.
            console.debug('[PluginContext] emitNote from', manifest.id, event)
          },
          playNote: (event) => {
            // Delegate audio playback to the host's ToneAdapter (Salamander piano).
            // Only play if the adapter is already initialised — pre-warm is triggered
            // by handleSelectPlugin so samples should be loaded before the first
            // keypress. Skipping while loading prevents notes queueing up and
            // firing all at once when init finally completes.
            const adapter = ToneAdapter.getInstance()
            if (!adapter.isInitialized()) return
            if (event.type === 'release') {
              adapter.releaseNote(event.midiNote)
            } else {
              adapter.attackNote(event.midiNote, event.velocity ?? 64)
            }
          },
          components: {
            // Host-provided notation staff — plugins use this to visualise notes
            // without importing the layout engine or score types directly.
            StaffViewer: PluginStaffViewer,
          },
          midi: {
            subscribe: (handler) => {
              midiPluginSubscribersRef.current.add(handler)
              return () => { midiPluginSubscribersRef.current.delete(handler) }
            },
          },
          manifest,
        }
        plugin.init(context)
      })

      setAllPlugins(entries)
    }

    loadPlugins()
  }, [])

  // Feature 030: Navigate to a plugin view (clears other view flags)
  const handleSelectPlugin = useCallback((pluginId: string) => {
    setActivePlugin(pluginId)
    setShowRecording(false)
    setShowPractice(false)
    setShowDemo(false)
    // Pre-warm the audio engine as soon as the user navigates to any plugin view.
    // This starts loading Salamander samples immediately so they are ready by the
    // time the user presses a key. The gesture of clicking a nav entry satisfies
    // the browser autoplay policy.
    ToneAdapter.getInstance().init().catch(() => {})
  }, [])

  // T024: Handle successful plugin import — add to allPlugins list
  const handleImportComplete = useCallback((manifest: PluginManifest) => {
    const pluginName = manifest.name
    const newEntry: BuiltinPluginEntry = {
      manifest,
      plugin: {
        init: () => {},
        dispose: () => {},
        Component: () => (
          <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
            <p>&#x1F4E6; "{pluginName}" is installed.</p>
            <p style={{ fontSize: '0.8em' }}>Reload the app to activate imported plugins.</p>
          </div>
        ),
      },
    }
    setAllPlugins(prev => {
      // Avoid duplicates (overwrite scenario replaces old entry)
      const filtered = prev.filter(p => p.manifest.id !== manifest.id)
      return [...filtered, newEntry]
    })
    setShowImporter(false)
  }, [])

  // Show loading state while WASM initializes
  if (wasmLoading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>
            Musicore{' '}
            <a 
              href="https://github.com/aylabs/musicore" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                fontSize: '0.5em', 
                color: '#999', 
                fontWeight: 'normal',
                textDecoration: 'none'
              }}
            >
              v{packageJson.version}
            </a>
          </h1>
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
          <p>Loading music engine...</p>
        </main>
      </div>
    )
  }

  // Show error state if WASM fails to initialize
  if (wasmError) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>
            Musicore{' '}
            <a 
              href="https://github.com/aylabs/musicore" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                fontSize: '0.5em', 
                color: '#999', 
                fontWeight: 'normal',
                textDecoration: 'none'
              }}
            >
              v{packageJson.version}
            </a>
          </h1>
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
          <h2 style={{ color: '#333' }}>Failed to Initialize Music Engine</h2>
          <p style={{ maxWidth: '600px', textAlign: 'center', color: '#333' }}>
            {wasmError?.includes('fetch') ? (
              <>
                <strong>Offline First Launch Detected</strong>
                <br /><br />
                This app requires <strong>one online visit</strong> to download the music engine before offline mode works.
                <br /><br />
                Please connect to the internet and reload the page.
              </>
            ) : (
              <>
                Your browser may not support WebAssembly, or there was an error loading the music engine.
              </>
            )}
          </p>
          <details style={{ maxWidth: '600px', marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#333' }}>Error Details</summary>
            <pre style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              background: '#f5f5f5', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.875rem',
              textAlign: 'left',
              color: '#333'
            }}>
              {wasmError}
            </pre>
          </details>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
            {wasmError?.includes('fetch') 
              ? 'After one online visit, all features work offline.' 
              : 'Try using a modern browser like Chrome, Firefox, Safari, or Edge.'
            }
          </p>
        </main>
      </div>
    )
  }

  // Normal app render once WASM is ready
  
  // Feature 001-recording-view: Show RecordingView when navigated to from ScoreViewer
  if (showRecording) {
    return (
      <RecordingView onBack={() => { setShowRecording(false); setShowPractice(true); }} />
    )
  }

  // Feature 001-piano-practice: Show PracticeView when navigated to from ScoreViewer
  if (showPractice) {
    return (
      <PracticeView onBack={() => setShowPractice(false)} />
    )
  }

  // Feature 017: Show RendererDemo if ?demo=true parameter is present
  if (showDemo) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>
            Musicore - Layout Renderer Demo{' '}
            <a 
              href="/"
              style={{ 
                fontSize: '0.5em', 
                color: '#999', 
                fontWeight: 'normal',
                textDecoration: 'none',
                marginLeft: '1rem'
              }}
            >
              ← Back to App
            </a>
          </h1>
        </header>
        <main>
          <RendererDemo />
        </main>
      </div>
    )
  }
  
  return (
    <TempoStateProvider>
      <FileStateProvider>
        <div className="app">
          <OfflineBanner />
          <header className="app-header">
            <h1>
              Musicore{' '}
              <a 
                href="https://github.com/aylabs/musicore" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  fontSize: '0.5em', 
                  color: '#999', 
                  fontWeight: 'normal',
                  textDecoration: 'none'
                }}
              >
                v{packageJson.version}
              </a>
            </h1>
            {/* Feature 030: Plugin navigation entries */}
            {allPlugins.length > 0 && (
              <nav
                aria-label="Installed plugins"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center',
                  marginTop: '8px',
                  paddingBottom: '4px',
                }}
              >
                {allPlugins.map(({ manifest }) => (
                  <PluginNavEntry
                    key={manifest.id}
                    plugin={manifest}
                    isActive={activePlugin === manifest.id}
                    onSelect={() => handleSelectPlugin(manifest.id)}
                  />
                ))}
                {/* T025: Import plugin trigger button */}
                <button
                  type="button"
                  aria-label="Import Plugin"
                  title="Import Plugin"
                  onClick={() => setShowImporter(true)}
                  style={{
                    minWidth: '44px',
                    minHeight: '44px',
                    border: '1px dashed #666',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: '#999',
                    fontSize: '1.2em',
                    cursor: 'pointer',
                    padding: '0 10px',
                  }}
                >
                  +
                </button>
              </nav>
            )}
          </header>
          {/* T024: Plugin importer dialog overlay */}
          {showImporter && (
            <PluginImporterDialog
              onImportComplete={handleImportComplete}
              onClose={() => setShowImporter(false)}
            />
          )}
          <main>
            {activePlugin ? (
              (() => {
                const entry = allPlugins.find(p => p.manifest.id === activePlugin)
                if (!entry) return null
                const PluginComponent = entry.plugin.Component
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 12px',
                        background: '#f5f5f5',
                        borderBottom: '1px solid #ddd',
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setActivePlugin(null)}
                        aria-label="Return to score viewer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#fff',
                          border: '1px solid #bbb',
                          borderRadius: '6px',
                          color: '#333',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          padding: '5px 12px',
                          minHeight: '32px',
                          cursor: 'pointer',
                        }}
                      >
                        ← Back
                      </button>
                      <span style={{ color: '#666', fontSize: '0.8rem' }}>
                        {entry.manifest.name}
                      </span>
                    </div>
                    <PluginView plugin={entry.manifest}>
                      <PluginComponent />
                    </PluginView>
                  </div>
                )
              })()
            ) : (
              <ScoreViewer
                debugMode={debugMode}
                onShowRecording={() => { setShowRecording(true); setActivePlugin(null); }}
                onShowPractice={() => { setShowPractice(true); setActivePlugin(null); }}
              />
            )}
          </main>
          <IOSInstallModal />
        </div>
      </FileStateProvider>
    </TempoStateProvider>
  )
}

export default App

