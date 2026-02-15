import type { ValidationResult } from '../../types/file';
import type { Score } from '../../types/score';

/**
 * Validates a JSON score file with 3-layer validation:
 * Layer 1: Syntax (valid JSON)
 * Layer 2: Structure (required fields and types)
 * Layer 3: Domain (musical constraints)
 * 
 * @param json - JSON string to validate
 * @returns ValidationResult with valid flag and error messages
 */
export function validateScoreFile(json: string): ValidationResult {
  const errors: string[] = [];

  // ============================================================================
  // Layer 1: Syntax Validation
  // ============================================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsedData: any;
  try {
    if (!json || json.trim() === '') {
      errors.push('Invalid JSON file format: empty string');
      return { valid: false, errors };
    }

    parsedData = JSON.parse(json);

    // Ensure it's an object, not a primitive or array
    if (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData)) {
      errors.push('Invalid JSON file format: expected object, got ' + (Array.isArray(parsedData) ? 'array' : typeof parsedData));
      return { valid: false, errors };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    errors.push(`Invalid JSON file format: ${message}`);
    return { valid: false, errors };
  }

  // ============================================================================
  // Layer 2: Structure Validation
  // ============================================================================
  validateStructure(parsedData, errors);

  // If structure validation failed, don't proceed to domain validation
  // (domain validation assumes valid structure)
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // ============================================================================
  // Layer 3: Domain Validation
  // ============================================================================
  validateDomain(parsedData as Score, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Layer 2: Validate required fields and types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateStructure(data: any, errors: string[]): void {
  // Required root fields
  if (!('id' in data)) {
    errors.push('Missing required field: id');
  } else if (typeof data.id !== 'string') {
    errors.push('Invalid type for id: expected string, got ' + typeof data.id);
  }

  if (!('global_structural_events' in data)) {
    errors.push('Missing required field: global_structural_events');
  } else if (!Array.isArray(data.global_structural_events)) {
    errors.push('Invalid type for global_structural_events: expected array, got ' + typeof data.global_structural_events);
  }

  if (!('instruments' in data)) {
    errors.push('Missing required field: instruments');
  } else if (!Array.isArray(data.instruments)) {
    errors.push('Invalid type for instruments: expected array, got ' + typeof data.instruments);
  } else {
    // Validate each instrument structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.instruments.forEach((instrument: any, idx: number) => {
      const prefix = `instruments[${idx}]`;
      
      if (!('id' in instrument)) {
        errors.push(`Missing required field: ${prefix}.id`);
      }
      if (!('name' in instrument)) {
        errors.push(`Missing required field: ${prefix}.name`);
      }
      if (!('instrument_type' in instrument)) {
        errors.push(`Missing required field: ${prefix}.instrument_type`);
      }
      if (!('staves' in instrument)) {
        errors.push(`Missing required field: ${prefix}.staves`);
      } else if (!Array.isArray(instrument.staves)) {
        errors.push(`Invalid type for ${prefix}.staves: expected array, got ` + typeof instrument.staves);
      } else {
        // Validate each staff structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        instrument.staves.forEach((staff: any, staffIdx: number) => {
          const staffPrefix = `${prefix}.staves[${staffIdx}]`;
          
          if (!('id' in staff)) {
            errors.push(`Missing required field: ${staffPrefix}.id`);
          }
          if (!('staff_structural_events' in staff)) {
            errors.push(`Missing required field: ${staffPrefix}.staff_structural_events`);
          } else if (!Array.isArray(staff.staff_structural_events)) {
            errors.push(`Invalid type for ${staffPrefix}.staff_structural_events: expected array`);
          }
          if (!('voices' in staff)) {
            errors.push(`Missing required field: ${staffPrefix}.voices`);
          } else if (!Array.isArray(staff.voices)) {
            errors.push(`Invalid type for ${staffPrefix}.voices: expected array`);
          } else {
            // Validate each voice structure
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            staff.voices.forEach((voice: any, voiceIdx: number) => {
              const voicePrefix = `${staffPrefix}.voices[${voiceIdx}]`;
              
              if (!('id' in voice)) {
                errors.push(`Missing required field: ${voicePrefix}.id`);
              }
              if (!('interval_events' in voice)) {
                errors.push(`Missing required field: ${voicePrefix}.interval_events`);
              } else if (!Array.isArray(voice.interval_events)) {
                errors.push(`Invalid type for ${voicePrefix}.interval_events: expected array`);
              }
            });
          }
        });
      }
    });
  }
}

/**
 * Layer 3: Validate domain constraints (musical rules)
 */
function validateDomain(score: Score, errors: string[]): void {
  // Validate global structural events
  score.global_structural_events.forEach((event, idx) => {
    if ('Tempo' in event) {
      const tempo = event.Tempo;
      
      // Validate tick (non-negative)
      if (tempo.tick < 0) {
        errors.push(`Invalid tick value at global_structural_events[${idx}]: tick must be non-negative, got ${tempo.tick}`);
      }
      
      // Validate BPM (20-300)
      if (tempo.bpm < 20 || tempo.bpm > 300) {
        errors.push(`Invalid BPM value at global_structural_events[${idx}]: BPM must be between 20 and 300, got ${tempo.bpm}`);
      }
    }

    if ('TimeSignature' in event) {
      const timeSig = event.TimeSignature;
      
      // Validate tick (non-negative)
      if (timeSig.tick < 0) {
        errors.push(`Invalid tick value at global_structural_events[${idx}]: tick must be non-negative, got ${timeSig.tick}`);
      }
      
      // Validate numerator (> 0)
      if (timeSig.numerator <= 0) {
        errors.push(`Invalid time signature numerator at global_structural_events[${idx}]: must be positive, got ${timeSig.numerator}`);
      }
      
      // Validate denominator (power of 2: 1, 2, 4, 8, 16, 32)
      const validDenominators = [1, 2, 4, 8, 16, 32];
      if (!validDenominators.includes(timeSig.denominator)) {
        errors.push(`Invalid time signature denominator at global_structural_events[${idx}]: must be power of 2 (1, 2, 4, 8, 16, 32), got ${timeSig.denominator}`);
      }
    }
  });

  // Validate instruments and their nested structure
  score.instruments.forEach((instrument, instIdx) => {
    instrument.staves.forEach((staff, staffIdx) => {
      // Validate staff structural events
      staff.staff_structural_events.forEach((event, eventIdx) => {
        if ('Clef' in event) {
          const clef = event.Clef;
          if (clef.tick < 0) {
            errors.push(`Invalid tick value at instruments[${instIdx}].staves[${staffIdx}].staff_structural_events[${eventIdx}]: tick must be non-negative, got ${clef.tick}`);
          }
        }
        if ('KeySignature' in event) {
          const keySig = event.KeySignature;
          if (keySig.tick < 0) {
            errors.push(`Invalid tick value at instruments[${instIdx}].staves[${staffIdx}].staff_structural_events[${eventIdx}]: tick must be non-negative, got ${keySig.tick}`);
          }
        }
      });

      // Validate voices and notes
      staff.voices.forEach((voice, voiceIdx) => {
        voice.interval_events.forEach((note, noteIdx) => {
          const notePrefix = `instruments[${instIdx}].staves[${staffIdx}].voices[${voiceIdx}].interval_events[${noteIdx}]`;
          
          // Validate pitch (21-108 for piano range A0 to C8)
          if (note.pitch < 21 || note.pitch > 108) {
            errors.push(`Invalid pitch value at ${notePrefix}: pitch must be between 21 and 108, got ${note.pitch}`);
          }
          
          // Validate start_tick (non-negative)
          if (note.start_tick < 0) {
            errors.push(`Invalid tick value at ${notePrefix}: start_tick must be non-negative, got ${note.start_tick}`);
          }
          
          // Validate duration_ticks (positive)
          if (note.duration_ticks <= 0) {
            errors.push(`Invalid duration value at ${notePrefix}: duration_ticks must be positive, got ${note.duration_ticks}`);
          }
        });
      });
    });
  });
}
