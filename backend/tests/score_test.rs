use musicore_backend::domain::{
    events::{
        tempo::TempoEvent,
        time_signature::TimeSignatureEvent,
    },
    instrument::Instrument,
    score::Score,
    value_objects::{BPM, Tick},
};

#[test]
fn test_score_creation_with_defaults() {
    let score = Score::new();
    
    assert_eq!(score.global_structural_events.len(), 2); // Tempo + Time Signature
    assert_eq!(score.instruments.len(), 0); // No default instrument
}

#[test]
fn test_score_default_tempo_at_tick_0() {
    let score = Score::new();
    
    let tempo_events: Vec<_> = score.global_structural_events.iter()
        .filter_map(|e| match e {
            musicore_backend::domain::events::global::GlobalStructuralEvent::Tempo(te) => Some(te),
            _ => None,
        })
        .collect();
    
    assert_eq!(tempo_events.len(), 1);
    assert_eq!(tempo_events[0].tick, Tick::new(0));
    assert_eq!(tempo_events[0].bpm, BPM::new(120).unwrap());
}

#[test]
fn test_score_default_time_signature_at_tick_0() {
    let score = Score::new();
    
    let time_sig_events: Vec<_> = score.global_structural_events.iter()
        .filter_map(|e| match e {
            musicore_backend::domain::events::global::GlobalStructuralEvent::TimeSignature(te) => Some(te),
            _ => None,
        })
        .collect();
    
    assert_eq!(time_sig_events.len(), 1);
    assert_eq!(time_sig_events[0].tick, Tick::new(0));
    assert_eq!(time_sig_events[0].numerator, 4);
    assert_eq!(time_sig_events[0].denominator, 4);
}

#[test]
fn test_score_add_tempo_event() {
    let mut score = Score::new();
    let tempo_event = TempoEvent::new(Tick::new(960), BPM::new(140).unwrap());
    
    let result = score.add_tempo_event(tempo_event);
    assert!(result.is_ok());
    
    let tempo_events: Vec<_> = score.global_structural_events.iter()
        .filter_map(|e| match e {
            musicore_backend::domain::events::global::GlobalStructuralEvent::Tempo(_) => Some(e),
            _ => None,
        })
        .collect();
    
    assert_eq!(tempo_events.len(), 2); // Default + new one
}

#[test]
fn test_score_reject_duplicate_tempo_at_same_tick() {
    let mut score = Score::new();
    let tempo_event = TempoEvent::new(Tick::new(0), BPM::new(100).unwrap());
    
    let result = score.add_tempo_event(tempo_event);
    assert!(result.is_err());
}

#[test]
fn test_score_add_time_signature_event() {
    let mut score = Score::new();
    let time_sig_event = TimeSignatureEvent::new(Tick::new(3840), 3, 4);
    
    let result = score.add_time_signature_event(time_sig_event);
    assert!(result.is_ok());
}

#[test]
fn test_score_reject_duplicate_time_signature_at_same_tick() {
    let mut score = Score::new();
    let time_sig_event = TimeSignatureEvent::new(Tick::new(0), 6, 8);
    
    let result = score.add_time_signature_event(time_sig_event);
    assert!(result.is_err());
}

#[test]
fn test_score_add_instrument() {
    let mut score = Score::new();
    let instrument = Instrument::new("Piano".to_string());
    
    score.add_instrument(instrument);
    assert_eq!(score.instruments.len(), 1); // Added instrument
    assert_eq!(score.instruments[0].name, "Piano");
}

#[test]
fn test_score_add_multiple_instruments() {
    let mut score = Score::new();
    
    score.add_instrument(Instrument::new("Piano".to_string()));
    score.add_instrument(Instrument::new("Guitar".to_string()));
    score.add_instrument(Instrument::new("Bass".to_string()));
    
    assert_eq!(score.instruments.len(), 3); // 3 added instruments
}

#[test]
fn test_score_aggregate_root_hierarchy() {
    let mut score = Score::new();
    let instrument = Instrument::new("Piano".to_string());
    
    score.add_instrument(instrument);
    
    // Verify full hierarchy accessible through aggregate root
    assert_eq!(score.instruments[0].staves.len(), 1);
    assert_eq!(score.instruments[0].staves[0].voices.len(), 1);
}
