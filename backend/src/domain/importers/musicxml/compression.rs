// Compression Handling for MusicXML Import - Feature 006-musicxml-import
// Handles both compressed (.mxl) and uncompressed (.musicxml, .xml) files

use super::errors::ImportError;
use std::fs;
use std::io::{self, Read};
use std::path::Path;
use zip::ZipArchive;

/// Handles loading MusicXML content from compressed (.mxl) or uncompressed files
pub struct CompressionHandler;

impl CompressionHandler {
    /// Loads MusicXML content from file, detecting format by extension
    ///
    /// # Arguments
    /// * `path` - Path to MusicXML file (.mxl, .musicxml, .xml)
    ///
    /// # Returns
    /// String containing XML content
    pub fn load_content(path: &Path) -> Result<String, ImportError> {
        let extension = path.extension().and_then(|ext| ext.to_str()).unwrap_or("");

        match extension.to_lowercase().as_str() {
            "mxl" => Self::load_compressed(path),
            "musicxml" | "xml" => Self::load_uncompressed(path),
            "" => Err(ImportError::UnsupportedFileType {
                extension: "(no extension)".to_string(),
            }),
            other => Err(ImportError::UnsupportedFileType {
                extension: other.to_string(),
            }),
        }
    }

    /// Loads XML content from compressed .mxl file (ZIP archive)
    ///
    /// # Format
    /// .mxl files are ZIP archives containing:
    /// - META-INF/container.xml - Points to main score file
    /// - *.musicxml or *.xml - The actual MusicXML content
    /// - Optional: images, fonts, etc.
    ///
    /// # Process
    /// 1. Open ZIP archive
    /// 2. Read META-INF/container.xml to find rootfile path
    /// 3. Extract and return content of rootfile
    pub fn load_compressed(path: &Path) -> Result<String, ImportError> {
        // Open ZIP file
        let file = fs::File::open(path).map_err(|e| ImportError::FileReadError {
            path: path.display().to_string(),
            source: e,
        })?;

        let mut archive = ZipArchive::new(file).map_err(|e| ImportError::CompressionError {
            message: format!("Failed to open ZIP archive: {}", e),
        })?;

        // Read container manifest to find rootfile
        let rootfile_path = Self::read_container_manifest(&mut archive)?;

        // Extract rootfile content
        let mut rootfile =
            archive
                .by_name(&rootfile_path)
                .map_err(|e| ImportError::InvalidStructure {
                    reason: format!("Rootfile '{}' not found in archive: {}", rootfile_path, e),
                })?;

        let mut content = String::new();
        rootfile
            .read_to_string(&mut content)
            .map_err(|e| ImportError::CompressionError {
                message: format!("Failed to read rootfile '{}': {}", rootfile_path, e),
            })?;

        Ok(content)
    }

    /// Loads XML content from uncompressed .musicxml or .xml file
    pub fn load_uncompressed(path: &Path) -> Result<String, ImportError> {
        fs::read_to_string(path).map_err(|e| ImportError::FileReadError {
            path: path.display().to_string(),
            source: e,
        })
    }

    /// Reads META-INF/container.xml to find the main score file path
    ///
    /// # Container.xml Format
    /// ```xml
    /// <?xml version="1.0" encoding="UTF-8"?>
    /// <container>
    ///   <rootfiles>
    ///     <rootfile full-path="score.musicxml"/>
    ///   </rootfiles>
    /// </container>
    /// ```
    ///
    /// # Returns
    /// Path to main MusicXML file within the archive
    pub fn read_container_manifest<R: Read + io::Seek>(
        archive: &mut ZipArchive<R>,
    ) -> Result<String, ImportError> {
        // Open META-INF/container.xml
        let mut container_file = archive.by_name("META-INF/container.xml").map_err(|e| {
            ImportError::InvalidStructure {
                reason: format!("META-INF/container.xml not found in .mxl archive: {}", e),
            }
        })?;

        let mut container_xml = String::new();
        container_file
            .read_to_string(&mut container_xml)
            .map_err(|e| ImportError::CompressionError {
                message: format!("Failed to read META-INF/container.xml: {}", e),
            })?;

        // Parse container.xml to find rootfile path
        // Simple regex-based extraction (full XML parser would be overkill here)
        let rootfile_path = Self::extract_rootfile_path(&container_xml)?;

        Ok(rootfile_path)
    }

    /// Extracts full-path attribute from <rootfile> element
    ///
    /// Looks for pattern: <rootfile full-path="..." />
    fn extract_rootfile_path(container_xml: &str) -> Result<String, ImportError> {
        // Find <rootfile full-path="..."/>
        let start_marker = "full-path=\"";
        let start_pos =
            container_xml
                .find(start_marker)
                .ok_or_else(|| ImportError::InvalidStructure {
                    reason: "No 'full-path' attribute found in META-INF/container.xml".to_string(),
                })?;

        let path_start = start_pos + start_marker.len();
        let remaining = &container_xml[path_start..];

        let path_end = remaining
            .find('"')
            .ok_or_else(|| ImportError::InvalidStructure {
                reason: "Malformed 'full-path' attribute in META-INF/container.xml".to_string(),
            })?;

        let rootfile_path = &remaining[..path_end];

        if rootfile_path.is_empty() {
            return Err(ImportError::InvalidStructure {
                reason: "Empty 'full-path' attribute in META-INF/container.xml".to_string(),
            });
        }

        Ok(rootfile_path.to_string())
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_load_uncompressed_musicxml() {
        // Create temporary .musicxml file
        let mut temp_file = NamedTempFile::new().unwrap();
        let xml_content = r#"<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
</score-partwise>"#;

        temp_file.write_all(xml_content.as_bytes()).unwrap();

        // Rename to .musicxml extension
        let temp_path = temp_file.path();
        let musicxml_path = temp_path.with_extension("musicxml");
        fs::copy(temp_path, &musicxml_path).unwrap();

        // Test loading
        let content = CompressionHandler::load_uncompressed(&musicxml_path).unwrap();
        assert!(content.contains("<score-partwise"));
        assert!(content.contains("Piano"));

        // Cleanup
        fs::remove_file(&musicxml_path).ok();
    }

    #[test]
    fn test_load_content_detects_extension() {
        let mut temp_file = NamedTempFile::new().unwrap();
        let xml_content = r#"<?xml version="1.0"?><score-partwise/>"#;
        temp_file.write_all(xml_content.as_bytes()).unwrap();

        let temp_path = temp_file.path();
        let xml_path = temp_path.with_extension("xml");
        fs::copy(temp_path, &xml_path).unwrap();

        let content = CompressionHandler::load_content(&xml_path).unwrap();
        assert!(content.contains("<score-partwise"));

        fs::remove_file(&xml_path).ok();
    }

    #[test]
    fn test_load_content_rejects_unsupported_extension() {
        let temp_path = Path::new("/tmp/score.pdf");
        let result = CompressionHandler::load_content(temp_path);
        assert!(result.is_err());

        if let Err(ImportError::UnsupportedFileType { extension }) = result {
            assert_eq!(extension, "pdf");
        } else {
            panic!("Expected UnsupportedFileType error");
        }
    }

    #[test]
    fn test_extract_rootfile_path() {
        let container_xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<container>
  <rootfiles>
    <rootfile full-path="score.musicxml"/>
  </rootfiles>
</container>"#;

        let path = CompressionHandler::extract_rootfile_path(container_xml).unwrap();
        assert_eq!(path, "score.musicxml");
    }

    #[test]
    fn test_extract_rootfile_path_with_subdirectory() {
        let container_xml = r#"<container>
  <rootfiles>
    <rootfile full-path="scores/main.musicxml" media-type="application/vnd.recordare.musicxml+xml"/>
  </rootfiles>
</container>"#;

        let path = CompressionHandler::extract_rootfile_path(container_xml).unwrap();
        assert_eq!(path, "scores/main.musicxml");
    }

    #[test]
    fn test_extract_rootfile_path_missing_attribute() {
        let container_xml = r#"<container>
  <rootfiles>
    <rootfile media-type="application/vnd.recordare.musicxml+xml"/>
  </rootfiles>
</container>"#;

        let result = CompressionHandler::extract_rootfile_path(container_xml);
        assert!(result.is_err());

        if let Err(ImportError::InvalidStructure { reason }) = result {
            assert!(reason.contains("full-path"));
        } else {
            panic!("Expected InvalidStructure error");
        }
    }

    #[test]
    fn test_load_file_not_found() {
        let result = CompressionHandler::load_uncompressed(Path::new("/nonexistent/file.musicxml"));
        assert!(result.is_err());

        if let Err(ImportError::FileReadError { path, .. }) = result {
            assert!(path.contains("nonexistent"));
        } else {
            panic!("Expected FileReadError");
        }
    }
}
