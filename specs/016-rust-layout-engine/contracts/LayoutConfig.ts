/**
 * Configuration options for layout computation.
 * Controls spacing, system breaking, and visual parameters.
 * 
 * Usage:
 *   const layout = computeLayout(compiledScore, {
 *     maxSystemWidth: 800,
 *     unitsPerSpace: 10,
 *     spacing: { baseSpacing: 20, durationFactor: 40, minimumSpacing: 20 }
 *   });
 */

/**
 * Complete layout configuration passed to compute_layout().
 */
export interface LayoutConfig {
  /** Maximum system width in logical units (default: 800.0) */
  maxSystemWidth?: number;
  
  /** Scaling factor: logical units per staff space (default: 10.0) */
  unitsPerSpace?: number;
  
  /** Vertical spacing between systems in logical units (default: 150.0) */
  systemSpacing?: number;
  
  /** Horizontal spacing algorithm configuration */
  spacing?: SpacingConfig;
  
  /** Font metrics source (default: embedded Bravura) */
  fontMetrics?: FontMetricsConfig;
}

/**
 * Horizontal spacing algorithm parameters.
 * Controls duration-proportional spacing formula:
 * spacing_width = max(baseSpacing + (duration / quarter) * durationFactor, minimumSpacing)
 */
export interface SpacingConfig {
  /** Minimum space for any note in logical units (default: 20.0 = 2 staff spaces) */
  baseSpacing?: number;
  
  /** Multiplier for duration-based spacing (default: 40.0, quarter note = 4 staff spaces) */
  durationFactor?: number;
  
  /** Collision prevention minimum in logical units (default: 20.0 = 2 staff spaces) */
  minimumSpacing?: number;
}

/**
 * Font metrics configuration.
 * Currently supports only embedded Bravura (extensible for future custom fonts).
 */
export interface FontMetricsConfig {
  /** Font family name (default: "Bravura") */
  fontFamily?: string;
  
  /** Source of metrics (default: "Embedded") */
  source?: FontMetricsSource;
}

/**
 * Font metrics source type.
 */
export enum FontMetricsSource {
  /** Use embedded Bravura metrics JSON (default) */
  Embedded = "Embedded",
  
  /** Reserved for future: fetch from URL */
  Remote = "Remote",
  
  /** Reserved for future: custom metrics object */
  Custom = "Custom",
}

/**
 * Default configuration values.
 * Used when optional fields omitted from LayoutConfig.
 */
export const DEFAULT_LAYOUT_CONFIG: Required<LayoutConfig> = {
  maxSystemWidth: 800.0,
  unitsPerSpace: 10.0,
  systemSpacing: 150.0,
  spacing: {
    baseSpacing: 20.0,
    durationFactor: 40.0,
    minimumSpacing: 20.0,
  },
  fontMetrics: {
    fontFamily: "Bravura",
    source: FontMetricsSource.Embedded,
  },
} as const;

/**
 * Preset configurations for common use cases.
 */
export const LAYOUT_PRESETS = {
  /** Standard spacing for practice scores */
  PRACTICE: {
    maxSystemWidth: 700.0,
    spacing: {
      baseSpacing: 25.0,      // More generous spacing
      durationFactor: 45.0,   // Exaggerated duration spacing
      minimumSpacing: 25.0,
    },
  } as Partial<LayoutConfig>,
  
  /** Compact spacing for performance parts */
  PERFORMANCE: {
    maxSystemWidth: 800.0,
    spacing: {
      baseSpacing: 18.0,      // Tighter spacing
      durationFactor: 35.0,   // Less duration emphasis
      minimumSpacing: 18.0,
    },
  } as Partial<LayoutConfig>,
  
  /** Dense spacing for orchestral scores */
  ORCHESTRAL: {
    maxSystemWidth: 900.0,
    systemSpacing: 100.0,     // Reduce vertical spacing
    spacing: {
      baseSpacing: 15.0,      // Very tight
      durationFactor: 30.0,   // Minimal duration spacing
      minimumSpacing: 15.0,
    },
  } as Partial<LayoutConfig>,
} as const;

/**
 * Helper to merge partial config with defaults.
 * 
 * @param partial User-provided partial configuration
 * @returns Complete configuration with defaults filled in
 * 
 * @example
 * const config = mergeConfig({ maxSystemWidth: 750 });
 * // Returns: { maxSystemWidth: 750, unitsPerSpace: 10, ... }
 */
export function mergeLayoutConfig(partial?: Partial<LayoutConfig>): Required<LayoutConfig> {
  return {
    maxSystemWidth: partial?.maxSystemWidth ?? DEFAULT_LAYOUT_CONFIG.maxSystemWidth,
    unitsPerSpace: partial?.unitsPerSpace ?? DEFAULT_LAYOUT_CONFIG.unitsPerSpace,
    systemSpacing: partial?.systemSpacing ?? DEFAULT_LAYOUT_CONFIG.systemSpacing,
    spacing: {
      baseSpacing: partial?.spacing?.baseSpacing ?? DEFAULT_LAYOUT_CONFIG.spacing.baseSpacing,
      durationFactor: partial?.spacing?.durationFactor ?? DEFAULT_LAYOUT_CONFIG.spacing.durationFactor,
      minimumSpacing: partial?.spacing?.minimumSpacing ?? DEFAULT_LAYOUT_CONFIG.spacing.minimumSpacing,
    },
    fontMetrics: {
      fontFamily: partial?.fontMetrics?.fontFamily ?? DEFAULT_LAYOUT_CONFIG.fontMetrics.fontFamily,
      source: partial?.fontMetrics?.source ?? DEFAULT_LAYOUT_CONFIG.fontMetrics.source,
    },
  };
}

/**
 * Type guard to validate LayoutConfig at runtime.
 * 
 * @param config Configuration object to validate
 * @returns True if config is valid, false otherwise
 */
export function isValidLayoutConfig(config: unknown): config is LayoutConfig {
  if (typeof config !== "object" || config === null) {
    return false;
  }
  
  const c = config as Partial<LayoutConfig>;
  
  // All fields optional, but if present must be correct type
  if (c.maxSystemWidth !== undefined && (typeof c.maxSystemWidth !== "number" || c.maxSystemWidth <= 0)) {
    return false;
  }
  
  if (c.unitsPerSpace !== undefined && (typeof c.unitsPerSpace !== "number" || c.unitsPerSpace <= 0)) {
    return false;
  }
  
  if (c.systemSpacing !== undefined && (typeof c.systemSpacing !== "number" || c.systemSpacing < 0)) {
    return false;
  }
  
  // Spacing subconfig validation
  if (c.spacing !== undefined) {
    if (typeof c.spacing !== "object" || c.spacing === null) {
      return false;
    }
    const s = c.spacing;
    if (s.baseSpacing !== undefined && (typeof s.baseSpacing !== "number" || s.baseSpacing <= 0)) {
      return false;
    }
    if (s.durationFactor !== undefined && (typeof s.durationFactor !== "number" || s.durationFactor < 0)) {
      return false;
    }
    if (s.minimumSpacing !== undefined && (typeof s.minimumSpacing !== "number" || s.minimumSpacing <= 0)) {
      return false;
    }
  }
  
  return true;
}
