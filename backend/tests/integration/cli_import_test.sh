#!/bin/bash
# T078: CLI Integration Test for musicore-import
# Tests that the CLI tool produces correct JSON output

set -e

echo "=== CLI Import Integration Test ==="

# Find the binary (check both debug and release)
BINARY=""
if [ -f "../../target/release/musicore-import" ]; then
    BINARY="../../target/release/musicore-import"
elif [ -f "../../target/debug/musicore-import" ]; then
    BINARY="../../target/debug/musicore-import"
else
    echo "ERROR: musicore-import binary not found"
    echo "Run 'cargo build --bin musicore-import' first"
    exit 1
fi

echo "Using binary: $BINARY"

# Test 1: Import simple melody to stdout
echo "Test 1: Import simple_melody.musicxml to stdout..."
OUTPUT=$($BINARY ../../../tests/fixtures/musicxml/simple_melody.musicxml 2>/dev/null)

# Verify JSON structure (CLI outputs Score directly, not ImportResult)
echo "$OUTPUT" | jq -e '.instruments[0]' > /dev/null || {
    echo "ERROR: Missing .instruments in output"
    exit 1
}

echo "$OUTPUT" | jq -e '.global_structural_events' > /dev/null || {
    echo "ERROR: Missing .global_structural_events in output"
    exit 1
}

# Verify note count by counting interval events
NOTE_COUNT=$(echo "$OUTPUT" | jq '[.instruments[0].staves[0].voices[0].interval_events[]] | length')
if [ "$NOTE_COUNT" != "8" ]; then
    echo "ERROR: Expected 8 notes, got $NOTE_COUNT"
    exit 1
fi

echo "✓ Test 1 passed: JSON output valid, 8 notes found"

# Test 2: Import to file
echo "Test 2: Import to file..."
OUTPUT_FILE="/tmp/cli_import_test.json"
$BINARY ../../../tests/fixtures/musicxml/simple_melody.musicxml -o "$OUTPUT_FILE" > /dev/null 2>&1

if [ ! -f "$OUTPUT_FILE" ]; then
    echo "ERROR: Output file not created"
    exit 1
fi

# Verify file content
jq -e '.instruments[0]' "$OUTPUT_FILE" > /dev/null || {
    echo "ERROR: Invalid JSON in output file"
    exit 1
}

FILE_NOTE_COUNT=$(jq '[.instruments[0].staves[0].voices[0].interval_events[]] | length' "$OUTPUT_FILE")
if [ "$FILE_NOTE_COUNT" != "8" ]; then
    echo "ERROR: Expected 8 notes in file, got $FILE_NOTE_COUNT"
    exit 1
fi

rm -f "$OUTPUT_FILE"
echo "✓ Test 2 passed: File output valid"

# Test 3: Validate-only mode
echo "Test 3: Validate-only mode..."
$BINARY ../../../tests/fixtures/musicxml/simple_melody.musicxml --validate-only > /dev/null || {
    echo "ERROR: Validation failed"
    exit 1
}

echo "✓ Test 3 passed: Validation succeeded"

# Test 4: Error handling for missing file
echo "Test 4: Error handling for missing file..."
if $BINARY /nonexistent/file.musicxml 2>&1 | grep -q "File not found"; then
    echo "✓ Test 4 passed: Error handling works"
else
    echo "ERROR: Expected 'File not found' message"
    exit 1
fi

# Test 5: Verbose mode
echo "Test 5: Verbose mode..."
VERBOSE_OUTPUT=$($BINARY ../../../tests/fixtures/musicxml/simple_melody.musicxml --verbose 2>&1 >/dev/null)

if echo "$VERBOSE_OUTPUT" | grep -q "Importing MusicXML"; then
    echo "✓ Test 5 passed: Verbose output present"
else
    echo "ERROR: Expected verbose output"
    exit 1
fi

echo ""
echo "=== All CLI tests passed! ==="
exit 0
