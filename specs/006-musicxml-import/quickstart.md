# Quickstart Guide: MusicXML Import

**Feature**: 006-musicxml-import  
**Phase**: Phase 1 - Design  
**Date**: 2026-02-08  

## Overview

This guide provides a step-by-step workflow for implementing MusicXML import functionality. Follow the TDD (Test-First Development) approach mandated by the musicore constitution.

---

## Prerequisites

- Rust 1.82+ installed
- Node.js 18+ and npm installed
- Musicore project cloned and building
- Feature branch `006-musicxml-import` checked out
- Research and design phases complete

---

## Development Workflow

### Phase 0: Setup (30 minutes)

**1. Add Dependencies**

Edit `backend/Cargo.toml`:

```toml
[dependencies]
# Existing dependencies...

# XML parsing
quick-xml = "0.31"

# ZIP compression for .mxl files
zip = "0.6"

# Error handling
thiserror = "1.0"

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Logging
log = "0.4"
env_logger = "0.10"

# UUID generation
uuid = { version = "1.0", features = ["v4", "serde"] }

[dev-dependencies]
# Test fixtures
tempfile = "3.8"

[[bin]]
name = "musicore-import"
path = "src/bin/musicore-import.rs"
```

**2. Create Directory Structure**

```bash
mkdir -p backend/src/domain/importers/musicxml
mkdir -p backend/src/adapters/cli
mkdir -p backend/src/bin
mkdir -p tests/fixtures/musicxml
mkdir -p frontend/src/components/import
mkdir -p frontend/src/services/import
mkdir -p frontend/src/hooks
```

**3. Download Test Fixtures**

Create test MusicXML files in `tests/fixtures/musicxml/`:

```bash
cd tests/fixtures/musicxml

# Simple melody (24 notes, single staff)
cat > simple_melody.musicxml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>480</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>480</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <!-- Add more notes... -->
    </measure>
  </part>
</score-partwise>
EOF
```

Or export actual files from MuseScore:
- simple_melody.musicxml (single staff)
- piano_grand_staff.musicxml (2 staves)
- quartet.mxl (compressed, 4 instruments)
- complex_rhythms.musicxml (triplets)
- malformed.xml (invalid XML for error testing)

---

### Phase 1: Backend - Domain Layer (8-10 hours)

**Task 1.1: Define Error Types**

`backend/src/domain/importers/musicxml/errors.rs`:

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ImportError {
    #[error("File read error: {path}")]
    FileReadError { path: String, source: std::io::Error },
    
    #[error("XML parse error at line {line}, column {column}: {message}")]
    ParseError { line: usize, column: usize, message: String },
    
    #[error("Invalid MusicXML structure: {reason}")]
    InvalidStructure { reason: String },
    
    #[error("Element mapping error: {context} - {source}")]
    MappingError { context: String, source: MappingError },
    
    #[error("Timing conversion error: {source}")]
    ConversionError { source: ConversionError },
    
    #[error("Domain validation failed")]
    ValidationError { errors: Vec<String> },
}

#[derive(Error, Debug)]
pub enum MappingError {
    #[error("Unsupported clef: {sign} on line {line}")]
    UnsupportedClef { sign: String, line: i32 },
    
    #[error("Invalid pitch step: {0}")]
    InvalidPitchStep(char),
    
    #[error("Pitch {midi} out of range (must be 0-127)")]
    PitchOutOfRange { midi: i32 },
}

#[derive(Error, Debug)]
pub enum ConversionError {
    #[error("Invalid divisions value: {0}")]
    InvalidDivisions(i32),
    
    #[error("Tick overflow: {0}")]
    TickOverflow(i64),
}
```

**Task 1.2: Implement Timing Conversion**

`backend/src/domain/importers/musicxml/timing.rs`:

```rust
use super::errors::ConversionError;

pub struct Fraction {
    pub numerator: i64,
    pub denominator: i64,
}

impl Fraction {
    pub fn from_musicxml(duration: i32, source_divisions: i32) -> Self {
        let numerator = duration as i64 * 960;
        let denominator = source_divisions as i64;
        Self { numerator, denominator }.normalize()
    }
    
    fn normalize(self) -> Self {
        let gcd = gcd(self.numerator, self.denominator);
        Fraction {
            numerator: self.numerator / gcd,
            denominator: self.denominator / gcd,
        }
    }
    
    pub fn to_ticks(&self) -> Result<i32, ConversionError> {
        if self.denominator == 1 {
            Ok(self.numerator as i32)
        } else {
            // Round to nearest
            let rounded = (self.numerator + self.denominator / 2) / self.denominator;
            Ok(rounded as i32)
        }
    }
}

fn gcd(a: i64, b: i64) -> i64 {
    if b == 0 { a.abs() } else { gcd(b, a % b) }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_quarter_note_480_divisions() {
        // divisions=480, quarter note duration=480
        let fraction = Fraction::from_musicxml(480, 480);
        assert_eq!(fraction.to_ticks().unwrap(), 960);
    }
    
    #[test]
    fn test_triplet_eighth_768_divisions() {
        // divisions=768, triplet eighth=256
        let fraction = Fraction::from_musicxml(256, 768);
        assert_eq!(fraction.to_ticks().unwrap(), 320);
    }
}
```

**Task 1.3: Implement Element Mapper**

`backend/src/domain/importers/musicxml/mapper.rs`:

```rust
use crate::domain::ClefType, KeySignature;
use super::errors::MappingError;

pub struct ElementMapper;

impl ElementMapper {
    pub fn map_clef(sign: &str, line: i32) -> Result<ClefType, MappingError> {
        match (sign, line) {
            ("G", 2) => Ok(ClefType::Treble),
            ("F", 4) => Ok(ClefType::Bass),
            ("C", 3) => Ok(ClefType::Alto),
            ("C", 4) => Ok(ClefType::Tenor),
            _ => Err(MappingError::UnsupportedClef {
                sign: sign.to_string(),
                line,
            }),
        }
    }
    
    pub fn map_pitch(step: char, octave: i32, alter: i32) -> Result<u8, MappingError> {
        let base = match step {
            'C' => 0, 'D' => 2, 'E' => 4, 'F' => 5,
            'G' => 7, 'A' => 9, 'B' => 11,
            _ => return Err(MappingError::InvalidPitchStep(step)),
        };
        
        let midi = (octave + 1) * 12 + base + alter;
        
        if midi < 0 || midi > 127 {
            Err(MappingError::PitchOutOfRange { midi })
        } else {
            Ok(midi as u8)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_map_clef_treble() {
        assert_eq!(ElementMapper::map_clef("G", 2).unwrap(), ClefType::Treble);
    }
    
    #[test]
    fn test_map_pitch_middle_c() {
        assert_eq!(ElementMapper::map_pitch('C', 4, 0).unwrap(), 60);
    }
    
    #[test]
    fn test_map_pitch_c_sharp() {
        assert_eq!(ElementMapper::map_pitch('C', 4, 1).unwrap(), 61);
    }
}
```

**Task 1.4: Implement XML Parser**

`backend/src/domain/importers/musicxml/parser.rs`:

```rust
use quick_xml::Reader;
use quick_xml::events::Event;
use super::types::*;
use super::errors::ImportError;

pub struct MusicXMLParser;

impl MusicXMLParser {
    pub fn parse(xml_content: &str) -> Result<MusicXMLDocument, ImportError> {
        let mut reader = Reader::from_str(xml_content);
        reader.trim_text(true);
        
        // Parse document structure
        // (Implementation details - event-based parsing)
        
        todo!("Implement XML parsing with quick-xml")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_simple_melody() {
        let xml = std::fs::read_to_string(
            "tests/fixtures/musicxml/simple_melody.musicxml"
        ).unwrap();
        
        let doc = MusicXMLParser::parse(&xml).unwrap();
        
        assert_eq!(doc.parts.len(), 1);
        assert_eq!(doc.parts[0].name, "Piano");
    }
}
```

**Task 1.5: Implement Converter**

`backend/src/domain/importers/musicxml/converter.rs`:

```rust
use crate::domain::{Score, Instrument, Staff, Voice, NoteEvent};
use super::types::*;
use super::timing::TimingContext;
use super::mapper::ElementMapper;
use super::errors::ImportError;

pub struct MusicXMLConverter;

impl MusicXMLConverter {
    pub fn convert(doc: MusicXMLDocument) -> Result<ImportResult, ImportError> {
        let mut score = Score::new();
        
        for part in doc.parts {
            let instrument = Self::convert_part(part)?;
            score.add_instrument(instrument);
        }
        
        // Validate domain model
        score.validate()?;
        
        Ok(ImportResult {
            score,
            metadata: ImportMetadata { /* ... */ },
            warnings: vec![],
            statistics: ImportStatistics { /* ... */ },
        })
    }
    
    fn convert_part(part: PartData) -> Result<Instrument, ImportError> {
        todo!("Implement part conversion")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_convert_simple_melody() {
        let doc = MusicXMLDocument { /* test fixture */ };
        let result = MusicXMLConverter::convert(doc).unwrap();
        
        assert_eq!(result.score.instruments.len(), 1);
        assert_eq!(result.statistics.note_count, 24);
    }
}
```

**Task 1.6: Implement Port (Interface)**

`backend/src/ports/importers.rs`:

```rust
use crate::domain::importers::musicxml::ImportResult;
use std::path::Path;

pub trait IMusicXMLImporter {
    fn import_file(&self, path: &Path) -> Result<ImportResult, ImportError>;
    fn validate_file(&self, path: &Path) -> Result<ValidationResult, ImportError>;
}
```

---

### Phase 2: Backend - Adapters (4-6 hours)

**Task 2.1: Implement CLI Adapter**

`backend/src/bin/musicore-import.rs`:

```rust
use clap::Parser;
use musicore::domain::importers::musicxml::MusicXMLImporter;

#[derive(Parser)]
#[command(name = "musicore-import")]
#[command(about = "Import MusicXML files")]
struct Cli {
    file: PathBuf,
    
    #[arg(short, long)]
    output: Option<PathBuf>,
    
    #[arg(short = 'v', long)]
    validate_only: bool,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    
    let importer = MusicXMLImporter::new();
    let result = importer.import_file(&cli.file)?;
    
    // Output result as JSON
    let output: Box<dyn Write> = match cli.output {
        Some(path) => Box::new(File::create(path)?),
        None => Box::new(io::stdout()),
    };
    
    serde_json::to_writer_pretty(output, &result)?;
    
    Ok(())
}
```

**Task 2.2: Implement API Adapter**

`backend/src/adapters/api/import.rs`:

```rust
use axum::{
    extract::Multipart,
    response::Json,
};
use crate::domain::importers::musicxml::MusicXMLImporter;

pub async fn import_musicxml(
    mut multipart: Multipart
) -> Result<Json<ImportResult>, ApiError> {
    // Extract file from multipart form
    while let Some(field) = multipart.next_field().await? {
        if field.name() == Some("file") {
            let data = field.bytes().await?;
            let content = String::from_utf8(data.to_vec())?;
            
            let importer = MusicXMLImporter::new();
            let result = importer.import_content(&content)?;
            
            return Ok(Json(result));
        }
    }
    
    Err(ApiError::MissingFile)
}
```

**Task 2.3: Register API Route**

`backend/src/main.rs`:

```rust
use axum::{
    Router,
    routing::post,
};

let app = Router::new()
    // Existing routes...
    .route("/api/v1/scores/import-musicxml", post(import_musicxml));
```

---

### Phase 3: Frontend - UI Components (4-6 hours)

**Task 3.1: Implement Import Service**

`frontend/src/services/import/MusicXMLImportService.ts`:

```typescript
import { Score, ImportResult } from '../../types';

export class MusicXMLImportService {
  private apiUrl: string;
  
  constructor(apiUrl = 'http://localhost:3000') {
    this.apiUrl = apiUrl;
  }
  
  async importFile(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(
      `${this.apiUrl}/api/v1/scores/import-musicxml`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      throw new Error(`Import failed: ${response.statusText}`);
    }
    
    return response.json();
  }
}
```

**Task 3.2: Create Import Hook**

`frontend/src/hooks/useImportMusicXML.ts`:

```typescript
import { useState } from 'react';
import { MusicXMLImportService } from '../services/import/MusicXMLImportService';
import { ImportResult } from '../types';

export function useImportMusicXML() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  
  const importFile = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const service = new MusicXMLImportService();
      const importResult = await service.importFile(file);
      setResult(importResult);
      return importResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { importFile, loading, error, result };
}
```

**Task 3.3: Create Import Button Component**

`frontend/src/components/import/ImportButton.tsx`:

```typescript
import React, { useRef } from 'react';
import { useImportMusicXML } from '../../hooks/useImportMusicXML';

interface ImportButtonProps {
  onImportComplete?: (result: ImportResult) => void;
}

export function ImportButton({ onImportComplete }: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importFile, loading, error } = useImportMusicXML();
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await importFile(file);
      onImportComplete?.(result);
    } catch (err) {
      console.error('Import failed:', err);
    }
  };
  
  return (
    <div>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
      >
        {loading ? 'Importing...' : 'Import MusicXML'}
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".musicxml,.xml,.mxl"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

---

### Phase 4: Testing (6-8 hours)

**Task 4.1: Backend Unit Tests**

Run all unit tests:

```bash
cd backend
cargo test --lib
```

Expected: All tests pass (20+ tests)

**Task 4.2: Backend Integration Tests**

`backend/tests/integration_musicxml_import.rs`:

```rust
use musicore::domain::importers::musicxml::MusicXMLImporter;

#[test]
fn test_import_simple_melody() {
    let importer = MusicXMLImporter::new();
    let result = importer.import_file(
        Path::new("tests/fixtures/musicxml/simple_melody.musicxml")
    ).unwrap();
    
    assert_eq!(result.statistics.note_count, 24);
    assert_eq!(result.score.instruments.len(), 1);
}

#[test]
fn test_import_piano_grand_staff() {
    let importer = MusicXMLImporter::new();
    let result = importer.import_file(
        Path::new("tests/fixtures/musicxml/piano_grand_staff.musicxml")
    ).unwrap();
    
    assert_eq!(result.score.instruments.len(), 1);
    assert_eq!(result.score.instruments[0].staves.len(), 2);
}

#[test]
fn test_import_compressed_mxl() {
    let importer = MusicXMLImporter::new();
    let result = importer.import_file(
        Path::new("tests/fixtures/musicxml/quartet.mxl")
    ).unwrap();
    
    assert_eq!(result.statistics.instrument_count, 4);
}
```

**Task 4.3: API Contract Tests**

```rust
#[tokio::test]
async fn test_api_import_endpoint() {
    let client = TestClient::new();
    
    let form = multipart::Form::new()
        .file("file", "tests/fixtures/musicxml/simple_melody.musicxml")
        .await
        .unwrap();
    
    let response = client
        .post("/api/v1/scores/import-musicxml")
        .multipart(form)
        .send()
        .await
        .unwrap();
    
    assert_eq!(response.status(), 200);
    
    let result: ImportResult = response.json().await.unwrap();
    assert_eq!(result.statistics.note_count, 24);
}
```

**Task 4.4: Frontend Tests**

`frontend/src/components/import/ImportButton.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportButton } from './ImportButton';

describe('ImportButton', () => {
  test('renders import button', () => {
    render(<ImportButton />);
    expect(screen.getByText('Import MusicXML')).toBeInTheDocument();
  });
  
  test('shows loading state during import', async () => {
    render(<ImportButton />);
    
    const file = new File(['<?xml...'], 'test.musicxml', {
      type: 'application/xml',
    });
    
    const input = screen.getByRole('button');
    fireEvent.click(input);
    
    // Simulate file selection
    // (requires mocking file input)
    
    await waitFor(() => {
      expect(screen.getByText('Importing...')).toBeInTheDocument();
    });
  });
});
```

---

### Phase 5: Performance Testing (2-3 hours)

**Task 5.1: Benchmark Tests**

`backend/benches/musicxml_import.rs`:

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use musicore::domain::importers::musicxml::MusicXMLImporter;

fn bench_import_simple_melody(c: &mut Criterion) {
    let importer = MusicXMLImporter::new();
    let path = Path::new("tests/fixtures/musicxml/simple_melody.musicxml");
    
    c.bench_function("import simple melody (24 notes)", |b| {
        b.iter(|| {
            importer.import_file(black_box(path)).unwrap()
        });
    });
}

fn bench_import_500_notes(c: &mut Criterion) {
    let importer = MusicXMLImporter::new();
    let path = Path::new("tests/fixtures/musicxml/large_500_notes.musicxml");
    
    c.bench_function("import 500 notes (SC-002 target)", |b| {
        b.iter(|| {
            importer.import_file(black_box(path)).unwrap()
        });
    });
}

criterion_group!(benches, bench_import_simple_melody, bench_import_500_notes);
criterion_main!(benches);
```

Run benchmarks:

```bash
cargo bench
```

**Expected Results**:
- Simple melody (24 notes): <50ms
- Medium file (500 notes): <3s (per SC-002)

---

### Phase 6: Documentation (1-2 hours)

**Task 6.1: Add API Documentation**

Update `backend/docs/api.md` with import endpoint details.

**Task 6.2: Add CLI Usage**

The `musicore-import` CLI tool is now fully implemented and ready to use.

**Installation**:

```bash
cd backend
cargo build --release
# Binary will be at: target/release/musicore-import
```

**Basic Usage**:

```bash
# Display help
musicore-import --help

# Import MusicXML file to stdout (JSON)
musicore-import path/to/score.musicxml

# Import to file
musicore-import path/to/score.musicxml -o output.json

# Import .mxl (compressed) file
musicore-import path/to/score.mxl -o output.json
```

**Command-Line Options**:

```
Usage: musicore-import [OPTIONS] <FILE>

Arguments:
  <FILE>  Path to MusicXML file to import (.xml or .mxl)

Options:
  -o, --output <FILE>    Output file path (default: stdout)
      --validate-only    Only validate the file without saving output
  -q, --quiet            Suppress all output except errors
  -v, --verbose          Enable verbose output with detailed statistics
  -f, --format <FORMAT>  Output format: json or yaml [default: json]
  -h, --help             Print help
  -V, --version          Print version
```

**Examples**:

```bash
# Validate a file without importing
musicore-import score.musicxml --validate-only

# Import with verbose statistics
musicore-import score.musicxml --verbose -o imported.json

# Quiet mode (errors only)
musicore-import score.musicxml -q -o output.json

# Pipe to other tools
musicore-import score.musicxml | jq '.instruments[0].name'
```

**Output Format**:

The CLI outputs the imported Score as JSON with full structure:

```json
{
  "id": "uuid",
  "global_structural_events": [
    {"Tempo": {"tick": 0, "bpm": 120}},
    {"TimeSignature": {"tick": 0, "numerator": 4, "denominator": 4}}
  ],
  "instruments": [
    {
      "id": "uuid",
      "name": "Piano",
      "instrument_type": "piano",
      "staves": [
        {
          "id": "uuid",
          "staff_structural_events": [
            {"Clef": {"tick": 0, "clef": "Treble"}},
            {"KeySignature": {"tick": 0, "key": "CMajor"}}
          ],
          "voices": [
            {
              "id": "uuid",
              "interval_events": [
                {
                  "id": "uuid",
                  "start_tick": 0,
                  "duration_ticks": 960,
                  "pitch": 60
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Import Statistics**:

When not in quiet mode, the CLI displays import statistics:

```
Import Statistics:
  Instruments: 1
  Staves:      1
  Voices:      1
  Notes:       8
  Duration:    7680 ticks
  Duration:    2.00 measures (at 960 PPQ, 4/4 time)  # verbose only

✓ Score saved to: output.json
```

**Exit Codes**:

- `0` - Success
- `1` - File not found or unsupported file type
- `2` - Import failed (parse or conversion error)
- `3` - Serialization error (invalid output format)
- `4` - Output file write error

**Testing the CLI**:

```bash
# Test with provided fixtures
cd backend

# Simple melody (8 notes, single staff)
cargo run --bin musicore-import -- \
  ../tests/fixtures/musicxml/simple_melody.musicxml \
  --validate-only

# Piano grand staff (2 staves)
cargo run --bin musicore-import -- \
  ../tests/fixtures/musicxml/piano_grand_staff.musicxml \
  -o /tmp/piano.json

# String quartet (4 instruments)
cargo run --bin musicore-import -- \
  ../tests/fixtures/musicxml/quartet.musicxml \
  --verbose
```

Update `README.md` with CLI usage examples.

**Task 6.3: Update Changelog**

`CHANGELOG.md`:

```markdown
## [Unreleased]

### Added
- MusicXML import from MuseScore exports (feature 006)
  - REST API endpoint: POST /api/v1/scores/import-musicxml
  - CLI tool: musicore-import
  - Support for .musicxml, .xml, .mxl formats
  - Timing conversion with ±1 tick accuracy
  - Element validation and error reporting
```

---

## Success Criteria Validation

After completing all phases, verify success criteria from spec:

- [ ] **SC-001**: Import single-staff melody (test with simple_melody.musicxml)
- [ ] **SC-002**: <3 seconds for 500 notes (benchmark test)
- [ ] **SC-003**: ±1 tick accuracy for 99% of notes (timing tests)
- [ ] **SC-004**: Import 2-staff piano score (test with piano_grand_staff.musicxml)
- [ ] **SC-005**: 95% import success rate (manual testing with MuseScore exports)
- [ ] **SC-006**: Support .mxl compressed format (test with quartet.mxl)
- [ ] **SC-007**: Clear error messages for malformed XML (test with malformed.xml)
- [ ] **SC-008**: CLI tool functional (run musicore-import --help)

---

## Time Estimates

| Phase | Duration | Description |
|-------|----------|-------------|
| Phase 0 | 30 min | Setup dependencies and fixtures |
| Phase 1 | 8-10 hours | Backend domain layer (TDD) |
| Phase 2 | 4-6 hours | Backend adapters (API + CLI) |
| Phase 3 | 4-6 hours | Frontend components and hooks |
| Phase 4 | 6-8 hours | Comprehensive testing |
| Phase 5 | 2-3 hours | Performance benchmarking |
| Phase 6 | 1-2 hours | Documentation |
| **Total** | **25-35 hours** | **4-5 working days + buffer** |

---

## Common Pitfalls

1. **Floating-point timing**: Always use integer arithmetic and Fraction struct
2. **Missing divisions attribute**: Default to 480 if not specified
3. **Chord notes**: Handle `<chord/>` element (same tick as previous note)
4. **Backup/forward**: Handle timing rewind for multi-voice notation
5. **Staff numbering**: MusicXML uses 1-indexed, ensure correct mapping
6. **Voice isolation**: Keep voices separate in Voice entities
7. **Validation order**: Parse → convert → validate (don't validate intermediate state)

---

## Debugging Tips

**Enable verbose logging**:

```bash
RUST_LOG=debug cargo test
RUST_LOG=musicore::domain::importers=trace cargo run
```

**Inspect parsed XML**:

```rust
println!("{:#?}", parsed_document);
```

**Check timing conversion**:

```rust
let fraction = Fraction::from_musicxml(duration, divisions);
println!("Duration {} / divisions {} = {} ticks (exact: {}/{})",
    duration, divisions, fraction.to_ticks()?, 
    fraction.numerator, fraction.denominator);
```

---

## Next Steps

After completing this quickstart:

1. Run `/speckit.tasks` to generate detailed task breakdown
2. Follow TDD: Write test → Run (fail) → Implement → Run (pass) → Refactor
3. Commit incrementally after each passing test suite
4. Update plan.md with progress notes
5. Mark tasks complete in tasks.md

---

## References

- [MusicXML 3.1 Specification](https://www.w3.org/2021/06/musicxml31/)
- [quick-xml Documentation](https://docs.rs/quick-xml/)
- [Axum Multipart Guide](https://docs.rs/axum/latest/axum/extract/struct.Multipart.html)
- [Feature Specification](./spec.md)
- [Data Model](./data-model.md)
- [API Contract](./contracts/api-import-musicxml.md)
- [CLI Contract](./contracts/cli-import.md)
