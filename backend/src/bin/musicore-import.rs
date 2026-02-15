// MusicXML Import CLI Tool - Feature 006-musicxml-import
// Command-line tool for importing MusicXML files into MusiCore format

use clap::Parser;
use musicore_backend::domain::importers::musicxml::MusicXMLImporter;
use musicore_backend::ports::importers::IMusicXMLImporter;
use std::fs;
use std::path::PathBuf;
use std::process;

/// CLI arguments for MusicXML import
#[derive(Parser, Debug)]
#[command(
    name = "musicore-import",
    about = "Import MusicXML files (.xml, .mxl) into MusiCore format",
    version
)]
struct Cli {
    /// Path to MusicXML file to import (.xml or .mxl)
    #[arg(value_name = "FILE")]
    file: PathBuf,

    /// Output file path (default: stdout)
    #[arg(short, long, value_name = "FILE")]
    output: Option<PathBuf>,

    /// Only validate the file without saving output
    #[arg(long)]
    validate_only: bool,

    /// Suppress all output except errors
    #[arg(short, long)]
    quiet: bool,

    /// Enable verbose output
    #[arg(short, long)]
    verbose: bool,

    /// Output format: json or yaml
    #[arg(short, long, default_value = "json")]
    format: String,
}

fn main() {
    // Parse command-line arguments
    let cli = Cli::parse();

    // Configure logging
    configure_logging(&cli);

    // Validate input file exists
    if !cli.file.exists() {
        eprintln!("Error: File not found: {}", cli.file.display());
        process::exit(1);
    }

    if cli.verbose {
        eprintln!("Importing MusicXML file: {}", cli.file.display());
    }

    // Create importer service
    let importer = MusicXMLImporter::new();

    // Import the file
    let result = match importer.import_file(&cli.file) {
        Ok(result) => result,
        Err(e) => {
            eprintln!("Error: Import failed: {}", e);
            // Print detailed error if available
            if let Some(source) = e.source() {
                eprintln!("Caused by: {}", source);
            }
            // Try to downcast to ImportError for detailed validation errors
            if let Some(musicore_backend::domain::importers::musicxml::ImportError::ValidationError { errors }) =
                e.downcast_ref::<musicore_backend::domain::importers::musicxml::ImportError>()
            {
                eprintln!("Validation errors:");
                for err in errors {
                    eprintln!("  - {}", err);
                }
            }
            process::exit(2);
        }
    };

    // Print statistics if not quiet
    if !cli.quiet {
        print_statistics(&result.statistics, cli.verbose);
    }

    // Print warnings if any
    if !result.warnings.is_empty() && !cli.quiet {
        eprintln!("\nWarnings:");
        for warning in &result.warnings {
            // Build context string from available fields
            let mut context_parts = Vec::new();
            if let Some(measure) = warning.measure_number {
                context_parts.push(format!("measure {}", measure));
            }
            if let Some(ref instrument) = warning.instrument_name {
                context_parts.push(instrument.clone());
            }
            if let Some(staff) = warning.staff_number {
                context_parts.push(format!("staff {}", staff));
            }
            if let Some(voice) = warning.voice_number {
                context_parts.push(format!("voice {}", voice));
            }

            let severity_marker = match warning.severity {
                musicore_backend::domain::importers::musicxml::WarningSeverity::Info => "ℹ",
                musicore_backend::domain::importers::musicxml::WarningSeverity::Warning => "⚠",
                musicore_backend::domain::importers::musicxml::WarningSeverity::Error => "✗",
            };

            if !context_parts.is_empty() {
                eprintln!(
                    "  {} [{}] {}",
                    severity_marker,
                    context_parts.join(", "),
                    warning.message
                );
            } else {
                eprintln!("  {} {}", severity_marker, warning.message);
            }
        }
    }

    // Validate-only mode: exit without saving
    if cli.validate_only {
        if !cli.quiet {
            eprintln!("\n✓ Validation successful");
        }
        process::exit(0);
    }

    // Serialize result
    let output_content = match cli.format.as_str() {
        "json" => match serde_json::to_string_pretty(&result.score) {
            Ok(json) => json,
            Err(e) => {
                eprintln!("Error: Failed to serialize to JSON: {}", e);
                process::exit(3);
            }
        },
        "yaml" => {
            eprintln!("Error: YAML output not yet implemented");
            process::exit(3);
        }
        other => {
            eprintln!("Error: Unsupported format: {}", other);
            process::exit(3);
        }
    };

    // Write output
    match &cli.output {
        Some(path) => {
            if let Err(e) = fs::write(path, output_content) {
                eprintln!("Error: Failed to write output file: {}", e);
                process::exit(4);
            }
            if !cli.quiet {
                eprintln!("\n✓ Score saved to: {}", path.display());
            }
        }
        None => {
            // Write to stdout
            println!("{}", output_content);
        }
    }
}

/// Configure logging based on CLI flags
fn configure_logging(cli: &Cli) {
    let log_level = if cli.quiet {
        "error"
    } else if cli.verbose {
        "debug"
    } else {
        "info"
    };

    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or(log_level))
        .format_timestamp(None)
        .init();
}

/// Print import statistics
fn print_statistics(stats: &musicore_backend::ports::importers::ImportStatistics, verbose: bool) {
    eprintln!("\nImport Statistics:");
    eprintln!("  Instruments: {}", stats.instrument_count);
    eprintln!("  Staves:      {}", stats.staff_count);
    eprintln!("  Voices:      {}", stats.voice_count);
    eprintln!("  Notes:       {}", stats.note_count);
    eprintln!("  Duration:    {} ticks", stats.duration_ticks);

    if verbose {
        eprintln!(
            "  Duration:    {:.2} measures (at 960 PPQ, 4/4 time)",
            stats.duration_ticks as f64 / (960.0 * 4.0)
        );
    }
}
