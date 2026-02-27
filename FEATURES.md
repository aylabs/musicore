# Musicore

**Live App**: [https://aylabs.github.io/musicore/](https://aylabs.github.io/musicore/)

A tablet-native app for interactive scores, designed for practice and performance.

---

## Current Features

### 🎼 Score Display
- **High-fidelity notation** rendering with SMuFL music font (Bravura)
- **Multiple clefs** support (Treble, Bass, Alto, Tenor)
- **Stacked staves view** for piano and multi-staff instruments
- **Accurate pitch positioning** with ledger lines
- **Chord symbols** display above the staff
- **Proportional spacing** based on musical timing

### 🎵 Score Management
- **MusicXML import** - Load industry-standard MusicXML files with resilient error handling
  - **Overlapping note resolution** - Automatically distributes notes to multiple voices
  - **Structural issue recovery** - Gracefully handles invalid notes (zero duration, malformed data)
  - **Import warnings** - Detailed diagnostics (OverlapResolution, StructuralIssues, MissingElements, PartialImport)
  - **Validated with real-world files** - Successfully imports Moonlight Sonata, Bach Preludes, Mozart Sonatas, Chopin Préludes
- **Demo score** on first launch for immediate exploration
- **Offline storage** - Scores persist locally using IndexedDB
- **View-only mode** - Focus on reading and performance (editing removed)

### ▶️ Performance Features
- **Audio playback** with Web Audio API
- **Auto-scroll** during playback
- **Note highlighting** - Visual feedback showing current position
- **Tempo control** - Adjust playback speed for practice
- **Repeat/navigation** - Jump to any point in the score
- **Optimized playback rendering** - Zero audio glitches on mobile devices
  - **Incremental highlight updates** - CSS class toggling via rAF, no SVG DOM rebuild
  - **O(log n) note lookup** - Binary search index for real-time highlight computation
  - **Device-adaptive frame rate** - 30 Hz mobile / 60 Hz desktop with frame budget monitoring
  - **Efficient tick broadcasting** - Ref-based tick source, minimal React re-renders

### 📱 Tablet-Optimized PWA
- **Offline-first** - Works without internet connection
- **Installable** - Add to home screen on tablets
- **Touch-friendly** - Optimized for tablet interaction
- **Portrait/landscape** support
- **Responsive layout** adapts to screen size

### ⚙️ Technology
- **WASM-powered** - Rust music engine compiled to WebAssembly
- **Precision timing** - 960 PPQ (Pulses Per Quarter note) resolution
- **Domain-driven design** - Clean architecture with hexagonal pattern
- **Test-first development** - 596+ tests ensuring quality

### 🎹 Plugin Architecture
- **Extensible plugin system** - Add new interactive views via the Plugin API v2
- **Virtual Keyboard** built-in plugin - Play notes directly in the browser
- **Practice View** built-in plugin - Piano practice exercise with scoring
  - **Pitch detection** - Microphone input via Web Audio API (shared stream)
  - **MIDI input** - Hardware MIDI keyboard support
  - **Scheduled playback** - `offsetMs` scheduling for exercise note sequences
  - **Exercise scoring** - Pitch accuracy and timing analysis
  - **Phase state machine** - Countdown → Playing → Results workflow
- **Importable plugins** - Third-party plugins distributed as ZIP packages

---

## Browser Requirements

- **Chrome/Edge**: Version 57+
- **Safari**: Version 11+
- **Target devices**: iPad, Surface, Android tablets

---

## Quick Start

**Try it now**: [https://aylabs.github.io/musicore/](https://aylabs.github.io/musicore/)

1. **Launch the app** - Opens with a demo score
2. **Import your score** - Click "Import Score" to load MusicXML files
3. **Play and explore** - Use playback controls to listen and follow along
4. **Install** - Add to your home screen for app-like experience

---

## Development

See [README.md](README.md) for development setup and architecture details.

---

**Version**: 1.0 (Read-Only Viewer)  
**Updated**: February 11, 2026
