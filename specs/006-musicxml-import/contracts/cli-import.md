# CLI Contract: MusicXML Import Command

**Feature**: 006-musicxml-import  
**Date**: 2026-02-08  

## Overview

Command-line tool for importing MusicXML files exported from MuseScore into musicore format.

---

## Binary

```bash
musicore-import
```

**Location**: `backend/target/release/musicore-import` (after compilation)  
**Wrapper Script**: `scripts/import-musicxml.sh` (optional convenience wrapper)

---

## Usage

```bash
musicore-import <file> [OPTIONS]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `<file>` | Path | Yes | Path to MusicXML file (.musicxml, .xml, or .mxl) |

### Options

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--output` | `-o` | Path | stdout | Output file path for JSON score (use `-` for stdout) |
| `--validate-only` | `-v` | Flag | false | Only validate file without importing |
| `--quiet` | `-q` | Flag | false | Suppress warnings and info messages |
| `--verbose` | | Flag | false | Show detailed progress and debug information |
| `--no-warnings` | | Flag | false | Hide warning messages (errors still shown) |
| `--format` | `-f` | Enum | json | Output format: `json`, `json-pretty`, `yaml` |
| `--help` | `-h` | Flag | - | Show help message |
| `--version` | `-V` | Flag | - | Show version information |

---

## Examples

### Example 1: Import to stdout (JSON)

```bash
musicore-import simple_melody.musicxml
```

**Output** (stdout):
```json
{"score":{"id":"550e8400-e29b-41d4-a716-446655440000","title":"Simple Melody","instruments":[...]},"metadata":{...},"statistics":{...},"warnings":[...]}
```

### Example 2: Import to file (pretty JSON)

```bash
musicore-import piano_sonata.musicxml -o output.json -f json-pretty
```

**Output**: Creates `output.json` with formatted JSON

### Example 3: Import compressed file

```bash
musicore-import quartet.mxl -o quartet.json
```

### Example 4: Validate without importing

```bash
musicore-import large_score.musicxml --validate-only
```

**Output** (stdout):
```
✓ Validation successful
  File: large_score.musicxml
  Version: MusicXML 3.1
  Notes: 2,450
  Instruments: 12
  Warnings: 5
```

### Example 5: Quiet mode (errors only)

```bash
musicore-import score.musicxml -o score.json --quiet
```

**Output**: Only errors printed to stderr, JSON to file

### Example 6: Verbose mode

```bash
musicore-import score.musicxml --verbose
```

**Output** (stderr):
```
[INFO] Reading file: score.musicxml
[INFO] Detected format: MusicXML 3.1
[INFO] Parsing XML... (8ms)
[INFO] Converting timing (divisions: 480 → 960 PPQ)...
[INFO] Processing part P1: Piano
[INFO]   - Staff 1: Treble clef, 24 notes
[INFO]   - Staff 2: Bass clef, 18 notes
[WARN] Unsupported element skipped: <lyric> in measure 2
[INFO] Validating domain model...
[INFO] Import complete (42ms)
```

### Example 7: Pipeline usage

```bash
musicore-import score.musicxml | jq '.statistics.note_count'
```

**Output**: `24`

---

## Exit Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 0 | Success | Import completed successfully |
| 1 | File Error | File not found or cannot be read |
| 2 | Parse Error | Invalid XML or MusicXML structure |
| 3 | Validation Error | Domain validation failed |
| 4 | Invalid Arguments | Wrong usage or invalid options |
| 64 | Internal Error | Unexpected internal error |

---

## Output Format

### JSON (default)

Compact single-line JSON (same schema as REST API):

```json
{"score":{...},"metadata":{...},"statistics":{...},"warnings":[...]}
```

### JSON Pretty (`--format json-pretty`)

Formatted with indentation:

```json
{
  "score": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Simple Melody",
    "instruments": [...]
  },
  "metadata": {...},
  "statistics": {...},
  "warnings": [...]
}
```

### YAML (`--format yaml`)

```yaml
score:
  id: 550e8400-e29b-41d4-a716-446655440000
  title: Simple Melody
  instruments:
    - id: inst-1
      name: Piano
      staves: [...]
metadata:
  file_name: simple_melody.musicxml
  version: "3.1"
  source_software: MuseScore 3.6.2
statistics:
  note_count: 24
  instrument_count: 1
warnings: []
```

---

## Validation-Only Mode

When `--validate-only` is set, output is human-readable instead of JSON:

### Success

```
✓ Validation successful
  File: score.musicxml
  Version: MusicXML 3.1
  Source: MuseScore 4.2.1
  Notes: 245
  Instruments: 4
  Staves: 4
  Voices: 6
  Measures: 32
  Warnings: 2

Warnings:
  [INFO] Lyric element skipped (not supported) - measure 5
  [WARN] Tempo not specified, default 120 BPM will be used
```

### Failure

```
✗ Validation failed
  File: invalid.musicxml
  Error: Invalid MusicXML structure

Validation Errors:
  - Missing required <part-list> element
  - Root element must be <score-partwise>
```

Exit code: 2

---

## Error Handling

### File Not Found

```bash
$ musicore-import nonexistent.musicxml
Error: File not found: nonexistent.musicxml
```

Exit code: 1

### Unsupported File Type

```bash
$ musicore-import score.pdf
Error: Unsupported file type: .pdf
Supported formats: .musicxml, .xml, .mxl
```

Exit code: 4

### Invalid XML

```bash
$ musicore-import malformed.xml
Error: Failed to parse XML
  Line: 42
  Column: 15
  Message: unexpected closing tag </note>
```

Exit code: 2

### Domain Validation Failed

```bash
$ musicore-import invalid_structure.musicxml
Error: Imported score failed domain validation

Validation Errors:
  - Staff 1 is missing clef at tick 0
  - Voice 2 has non-monotonic tick values

Run with --verbose for more details.
```

Exit code: 3

---

## Logging

### Default (Normal Mode)

- Errors: printed to stderr
- Warnings: printed to stderr (can disable with `--no-warnings`)
- Output: printed to stdout (or file if `-o` specified)

### Quiet Mode (`--quiet`)

- Errors: printed to stderr
- Warnings: suppressed
- Output: printed to stdout/file only

### Verbose Mode (`--verbose`)

- All log levels: [INFO], [WARN], [ERROR] to stderr
- Progress updates during import
- Timing information
- Element counts
- Output: printed to stdout/file

---

## Implementation Details

### Binary Structure

```rust
// backend/src/bin/musicore-import.rs

use clap::{Parser, ValueEnum};
use musicore::{
    domain::importers::musicxml::{MusicXMLImporter, ImportOptions},
    adapters::cli::CliImporter,
};

#[derive(Parser)]
#[command(name = "musicore-import")]
#[command(about = "Import MusicXML files into musicore format")]
#[command(version)]
struct Cli {
    /// Path to MusicXML file (.musicxml, .xml, or .mxl)
    #[arg(value_name = "FILE")]
    file: PathBuf,
    
    /// Output file path (use '-' for stdout)
    #[arg(short, long, value_name = "PATH")]
    output: Option<PathBuf>,
    
    /// Only validate file without importing
    #[arg(short = 'v', long)]
    validate_only: bool,
    
    /// Suppress warnings and info messages
    #[arg(short, long)]
    quiet: bool,
    
    /// Show detailed progress information
    #[arg(long)]
    verbose: bool,
    
    /// Hide warning messages
    #[arg(long)]
    no_warnings: bool,
    
    /// Output format
    #[arg(short, long, value_enum, default_value = "json")]
    format: OutputFormat,
}

#[derive(Clone, ValueEnum)]
enum OutputFormat {
    Json,
    JsonPretty,
    Yaml,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    
    // Configure logging
    let log_level = if cli.verbose {
        log::LevelFilter::Debug
    } else if cli.quiet || cli.no_warnings {
        log::LevelFilter::Error
    } else {
        log::LevelFilter::Warn
    };
    env_logger::builder().filter_level(log_level).init();
    
    // Create importer
    let importer = MusicXMLImporter::new();
    let cli_adapter = CliImporter::new(importer);
    
    // Import or validate
    let result = if cli.validate_only {
        cli_adapter.validate(&cli.file)?
    } else {
        cli_adapter.import(&cli.file)?
    };
    
    // Output result
    let output_writer: Box<dyn Write> = match &cli.output {
        Some(path) if path.to_str() != Some("-") => {
            Box::new(File::create(path)?)
        }
        _ => Box::new(io::stdout()),
    };
    
    match cli.format {
        OutputFormat::Json => {
            serde_json::to_writer(output_writer, &result)?;
        }
        OutputFormat::JsonPretty => {
            serde_json::to_writer_pretty(output_writer, &result)?;
        }
        OutputFormat::Yaml => {
            serde_yaml::to_writer(output_writer, &result)?;
        }
    }
    
    Ok(())
}
```

### Wrapper Script

```bash
#!/usr/bin/env bash
# scripts/import-musicxml.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BINARY="$PROJECT_ROOT/backend/target/release/musicore-import"

# Build if binary doesn't exist
if [ ! -f "$BINARY" ]; then
    echo "Building musicore-import..." >&2
    cd "$PROJECT_ROOT/backend"
    cargo build --release --bin musicore-import
fi

# Run binary with all arguments
exec "$BINARY" "$@"
```

---

## Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_cli_parse_basic() {
        let cli = Cli::parse_from(&["musicore-import", "test.musicxml"]);
        assert_eq!(cli.file, PathBuf::from("test.musicxml"));
        assert!(cli.output.is_none());
        assert!(!cli.validate_only);
    }
    
    #[test]
    fn test_cli_parse_output() {
        let cli = Cli::parse_from(&[
            "musicore-import", "test.musicxml", "-o", "output.json"
        ]);
        assert_eq!(cli.output, Some(PathBuf::from("output.json")));
    }
}
```

### Integration Tests

```bash
#!/usr/bin/env bash
# tests/integration/test_cli_import.sh

set -euo pipefail

BINARY="./target/release/musicore-import"
FIXTURES="./tests/fixtures/musicxml"

# Test 1: Import simple melody
echo "Test 1: Import simple melody"
$BINARY "$FIXTURES/simple_melody.musicxml" -o /tmp/output.json
jq -e '.statistics.note_count == 24' /tmp/output.json
echo "✓ Pass"

# Test 2: Validate only
echo "Test 2: Validate only"
$BINARY "$FIXTURES/simple_melody.musicxml" --validate-only > /dev/null
echo "✓ Pass"

# Test 3: Invalid file (expect exit code 1)
echo "Test 3: File not found"
if $BINARY "nonexistent.musicxml" 2>/dev/null; then
    echo "✗ Fail: Should have exited with error"
    exit 1
else
    echo "✓ Pass"
fi

# Test 4: Compressed .mxl file
echo "Test 4: Compressed .mxl import"
$BINARY "$FIXTURES/quartet.mxl" -o /tmp/quartet.json
jq -e '.statistics.instrument_count == 4' /tmp/quartet.json
echo "✓ Pass"

echo ""
echo "All tests passed!"
```

---

## Performance

| Scenario | Expected Time | Notes |
|----------|---------------|-------|
| Small file (<100 notes) | <100ms | Includes parsing, conversion, output |
| Medium file (500 notes) | <3s | Per SC-002 |
| Large file (2000 notes) | <10s | May show progress with --verbose |
| Validation only | <50ms | Skips conversion |

---

## Compatibility

- **OS**: macOS, Linux, Windows
- **Dependencies**: None (statically linked Rust binary)
- **Minimum Rust Version**: 1.82+

---

## Future Enhancements

- **Batch Import**: `musicore-import *.musicxml` with parallel processing
- **Watch Mode**: `musicore-import --watch directory/` for continuous import
- **Progress Bar**: Show progress for large files (>1000 notes)
- **Diff Mode**: Compare with existing score and show changes

---

## See Also

- [API Contract](./api-import-musicxml.md) - REST API endpoint
- [Data Model](../data-model.md) - Type definitions
- [Research](../research.md) - Technical decisions
