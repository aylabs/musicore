use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::adapters::dtos::{InstrumentDto, ScoreDto, StaffDto};
use crate::domain::{
    errors::{DomainError, PersistenceError},
    events::{
        clef::ClefEvent, global::GlobalStructuralEvent, key_signature::KeySignatureEvent,
        note::Note, staff::StaffStructuralEvent, tempo::TempoEvent,
        time_signature::TimeSignatureEvent,
    },
    ids::{InstrumentId, ScoreId, StaffId, VoiceId},
    instrument::Instrument,
    score::Score,
    staff::Staff,
    value_objects::{BPM, Clef, KeySignature, Pitch, Tick},
    voice::Voice,
};
use crate::ports::persistence::ScoreRepository;

/// Application state with repository
pub type AppState = Arc<dyn ScoreRepository + Send + Sync>;

// ===== Request/Response DTOs =====

#[derive(Debug, Deserialize)]
pub struct CreateScoreRequest {
    pub name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ScoreListResponse {
    pub scores: Vec<String>, // UUIDs as strings
}

// Note: ScoreDto, InstrumentDto, and StaffDto are now imported from shared adapters::dtos module

#[derive(Debug, Deserialize)]
pub struct AddInstrumentRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct AddNoteRequest {
    pub start_tick: u32,
    pub duration_ticks: u32,
    pub pitch: u8,
}

#[derive(Debug, Deserialize)]
pub struct AddTempoEventRequest {
    pub tick: u32,
    pub bpm: u16,
}

#[derive(Debug, Deserialize)]
pub struct AddTimeSignatureEventRequest {
    pub tick: u32,
    pub numerator: u8,
    pub denominator: u8,
}

#[derive(Debug, Deserialize)]
pub struct AddClefEventRequest {
    pub tick: u32,
    pub clef: String, // "treble", "bass", "alto", "tenor"
}

#[derive(Debug, Deserialize)]
pub struct AddKeySignatureEventRequest {
    pub tick: u32,
    pub sharps: i8, // -7 to 7
}

// ===== Handlers =====

/// POST /scores - Create new score
pub async fn create_score(
    State(repo): State<AppState>,
    Json(_payload): Json<CreateScoreRequest>,
) -> Result<impl IntoResponse, DomainError> {
    let score = Score::new();
    repo.save(score.clone())
        .map_err(|e| DomainError::ValidationError(format!("Failed to save score: {:?}", e)))?;

    Ok((StatusCode::CREATED, Json(score)))
}

/// GET /scores - List all scores
pub async fn list_scores(
    State(repo): State<AppState>,
) -> Result<impl IntoResponse, PersistenceError> {
    let scores = repo.list_all()?;
    let score_ids: Vec<String> = scores.iter().map(|s| s.id.to_string()).collect();

    Ok(Json(ScoreListResponse { scores: score_ids }))
}

/// GET /scores/{score_id} - Get score by ID
pub async fn get_score(
    State(repo): State<AppState>,
    Path(score_id): Path<String>,
) -> Result<impl IntoResponse, PersistenceError> {
    let id = ScoreId::parse(&score_id)
        .map_err(|e| PersistenceError::NotFound(format!("Invalid UUID: {}", e)))?;

    let score = repo
        .find_by_id(id)?
        .ok_or_else(|| PersistenceError::NotFound(format!("Score {} not found", score_id)))?;

    // Convert to DTO with active_clef field (Feature 007)
    let score_dto = ScoreDto::from(&score);

    Ok(Json(score_dto))
}

/// DELETE /scores/{score_id} - Delete score
pub async fn delete_score(
    State(repo): State<AppState>,
    Path(score_id): Path<String>,
) -> Result<impl IntoResponse, PersistenceError> {
    let id = ScoreId::parse(&score_id)
        .map_err(|e| PersistenceError::NotFound(format!("Invalid UUID: {}", e)))?;

    repo.delete(id)?;

    Ok(StatusCode::NO_CONTENT)
}

/// POST /scores/{score_id}/instruments - Add instrument
pub async fn add_instrument(
    State(repo): State<AppState>,
    Path(score_id): Path<String>,
    Json(payload): Json<AddInstrumentRequest>,
) -> Result<impl IntoResponse, DomainError> {
    let id = ScoreId::parse(&score_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid UUID: {}", e)))?;

    let mut score = repo
        .find_by_id(id)
        .map_err(|e| DomainError::NotFound(format!("Score not found: {:?}", e)))?
        .ok_or_else(|| DomainError::NotFound(format!("Score {} not found", score_id)))?;

    let instrument = Instrument::new(payload.name);
    score.add_instrument(instrument.clone());

    repo.save(score)
        .map_err(|e| DomainError::ValidationError(format!("Failed to save: {:?}", e)))?;

    Ok((StatusCode::CREATED, Json(instrument)))
}

/// POST /scores/{score_id}/instruments/{instrument_id}/staves - Add staff
pub async fn add_staff(
    State(repo): State<AppState>,
    Path((score_id, instrument_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, DomainError> {
    let score_id = ScoreId::parse(&score_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid score UUID: {}", e)))?;
    let instrument_id = InstrumentId::parse(&instrument_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid instrument UUID: {}", e)))?;

    let mut score = repo
        .find_by_id(score_id)
        .map_err(|e| DomainError::NotFound(format!("Score not found: {:?}", e)))?
        .ok_or_else(|| DomainError::NotFound("Score not found".to_string()))?;

    // Find instrument
    let instrument = score
        .instruments
        .iter_mut()
        .find(|i| i.id == instrument_id)
        .ok_or_else(|| DomainError::NotFound("Instrument not found".to_string()))?;

    let staff = Staff::new();
    instrument.add_staff(staff.clone());

    repo.save(score)
        .map_err(|e| DomainError::ValidationError(format!("Failed to save: {:?}", e)))?;

    Ok((StatusCode::CREATED, Json(staff)))
}

/// POST /scores/{score_id}/instruments/{instrument_id}/staves/{staff_id}/voices - Add voice
pub async fn add_voice(
    State(repo): State<AppState>,
    Path((score_id, instrument_id, staff_id)): Path<(String, String, String)>,
) -> Result<impl IntoResponse, DomainError> {
    let score_id = ScoreId::parse(&score_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid score UUID: {}", e)))?;
    let instrument_id = InstrumentId::parse(&instrument_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid instrument UUID: {}", e)))?;
    let staff_id = StaffId::parse(&staff_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid staff UUID: {}", e)))?;

    let mut score = repo
        .find_by_id(score_id)
        .map_err(|e| DomainError::NotFound(format!("Score not found: {:?}", e)))?
        .ok_or_else(|| DomainError::NotFound("Score not found".to_string()))?;

    let instrument = score
        .instruments
        .iter_mut()
        .find(|i| i.id == instrument_id)
        .ok_or_else(|| DomainError::NotFound("Instrument not found".to_string()))?;

    let staff = instrument.get_staff_mut(staff_id)?;

    let voice = Voice::new();
    staff.add_voice(voice.clone());

    repo.save(score)
        .map_err(|e| DomainError::ValidationError(format!("Failed to save: {:?}", e)))?;

    Ok((StatusCode::CREATED, Json(voice)))
}

/// POST /scores/{score_id}/instruments/{instrument_id}/staves/{staff_id}/voices/{voice_id}/notes - Add note
pub async fn add_note(
    State(repo): State<AppState>,
    Path((score_id, instrument_id, staff_id, voice_id)): Path<(String, String, String, String)>,
    Json(payload): Json<AddNoteRequest>,
) -> Result<impl IntoResponse, DomainError> {
    let score_id = ScoreId::parse(&score_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid score UUID: {}", e)))?;
    let instrument_id = InstrumentId::parse(&instrument_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid instrument UUID: {}", e)))?;
    let staff_id = StaffId::parse(&staff_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid staff UUID: {}", e)))?;
    let voice_id = VoiceId::parse(&voice_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid voice UUID: {}", e)))?;

    let mut score = repo
        .find_by_id(score_id)
        .map_err(|e| DomainError::NotFound(format!("Score not found: {:?}", e)))?
        .ok_or_else(|| DomainError::NotFound("Score not found".to_string()))?;

    let instrument = score
        .instruments
        .iter_mut()
        .find(|i| i.id == instrument_id)
        .ok_or_else(|| DomainError::NotFound("Instrument not found".to_string()))?;

    let staff = instrument.get_staff_mut(staff_id)?;
    let voice = staff.get_voice_mut(voice_id)?;

    let note = Note::new(
        Tick::new(payload.start_tick),
        payload.duration_ticks,
        Pitch::new(payload.pitch).map_err(|e| DomainError::ValidationError(e.to_string()))?,
    )
    .map_err(|e| DomainError::ValidationError(e.to_string()))?;

    voice.add_note(note.clone())?;

    repo.save(score)
        .map_err(|e| DomainError::ValidationError(format!("Failed to save: {:?}", e)))?;

    Ok((StatusCode::CREATED, Json(note)))
}

/// POST /scores/{score_id}/structural-events/tempo - Add tempo event
pub async fn add_tempo_event(
    State(repo): State<AppState>,
    Path(score_id): Path<String>,
    Json(payload): Json<AddTempoEventRequest>,
) -> Result<impl IntoResponse, DomainError> {
    let id = ScoreId::parse(&score_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid UUID: {}", e)))?;

    let mut score = repo
        .find_by_id(id)
        .map_err(|e| DomainError::NotFound(format!("Score not found: {:?}", e)))?
        .ok_or_else(|| DomainError::NotFound("Score not found".to_string()))?;

    let tempo_event = TempoEvent::new(
        Tick::new(payload.tick),
        BPM::new(payload.bpm).map_err(|e| DomainError::ValidationError(e.to_string()))?,
    );

    score.add_tempo_event(tempo_event.clone())?;

    repo.save(score)
        .map_err(|e| DomainError::ValidationError(format!("Failed to save: {:?}", e)))?;

    Ok((StatusCode::CREATED, Json(tempo_event)))
}

/// POST /scores/{score_id}/structural-events/time-signature - Add time signature event
pub async fn add_time_signature_event(
    State(repo): State<AppState>,
    Path(score_id): Path<String>,
    Json(payload): Json<AddTimeSignatureEventRequest>,
) -> Result<impl IntoResponse, DomainError> {
    let id = ScoreId::parse(&score_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid UUID: {}", e)))?;

    let mut score = repo
        .find_by_id(id)
        .map_err(|e| DomainError::NotFound(format!("Score not found: {:?}", e)))?
        .ok_or_else(|| DomainError::NotFound("Score not found".to_string()))?;

    let time_sig_event = TimeSignatureEvent::new(
        Tick::new(payload.tick),
        payload.numerator,
        payload.denominator,
    );

    score.add_time_signature_event(time_sig_event.clone())?;

    repo.save(score)
        .map_err(|e| DomainError::ValidationError(format!("Failed to save: {:?}", e)))?;

    Ok((StatusCode::CREATED, Json(time_sig_event)))
}

/// POST /scores/{score_id}/instruments/{instrument_id}/staves/{staff_id}/structural-events/clef - Add clef event
pub async fn add_clef_event(
    State(repo): State<AppState>,
    Path((score_id, instrument_id, staff_id)): Path<(String, String, String)>,
    Json(payload): Json<AddClefEventRequest>,
) -> Result<impl IntoResponse, DomainError> {
    let score_id = ScoreId::parse(&score_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid score UUID: {}", e)))?;
    let instrument_id = InstrumentId::parse(&instrument_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid instrument UUID: {}", e)))?;
    let staff_id = StaffId::parse(&staff_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid staff UUID: {}", e)))?;

    let mut score = repo
        .find_by_id(score_id)
        .map_err(|e| DomainError::NotFound(format!("Score not found: {:?}", e)))?
        .ok_or_else(|| DomainError::NotFound("Score not found".to_string()))?;

    let instrument = score
        .instruments
        .iter_mut()
        .find(|i| i.id == instrument_id)
        .ok_or_else(|| DomainError::NotFound("Instrument not found".to_string()))?;

    let staff = instrument.get_staff_mut(staff_id)?;

    let clef = match payload.clef.to_lowercase().as_str() {
        "treble" => Clef::Treble,
        "bass" => Clef::Bass,
        "alto" => Clef::Alto,
        "tenor" => Clef::Tenor,
        _ => {
            return Err(DomainError::ValidationError(format!(
                "Invalid clef: {}",
                payload.clef
            )));
        }
    };

    let clef_event = ClefEvent::new(Tick::new(payload.tick), clef);
    staff.add_clef_event(clef_event.clone())?;

    repo.save(score)
        .map_err(|e| DomainError::ValidationError(format!("Failed to save: {:?}", e)))?;

    Ok((StatusCode::CREATED, Json(clef_event)))
}

/// POST /scores/{score_id}/instruments/{instrument_id}/staves/{staff_id}/structural-events/key-signature - Add key signature event
pub async fn add_key_signature_event(
    State(repo): State<AppState>,
    Path((score_id, instrument_id, staff_id)): Path<(String, String, String)>,
    Json(payload): Json<AddKeySignatureEventRequest>,
) -> Result<impl IntoResponse, DomainError> {
    let score_id = ScoreId::parse(&score_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid score UUID: {}", e)))?;
    let instrument_id = InstrumentId::parse(&instrument_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid instrument UUID: {}", e)))?;
    let staff_id = StaffId::parse(&staff_id)
        .map_err(|e| DomainError::NotFound(format!("Invalid staff UUID: {}", e)))?;

    let mut score = repo
        .find_by_id(score_id)
        .map_err(|e| DomainError::NotFound(format!("Score not found: {:?}", e)))?
        .ok_or_else(|| DomainError::NotFound("Score not found".to_string()))?;

    let instrument = score
        .instruments
        .iter_mut()
        .find(|i| i.id == instrument_id)
        .ok_or_else(|| DomainError::NotFound("Instrument not found".to_string()))?;

    let staff = instrument.get_staff_mut(staff_id)?;

    let key_sig_event = KeySignatureEvent::new(
        Tick::new(payload.tick),
        KeySignature::new(payload.sharps)
            .map_err(|e| DomainError::ValidationError(e.to_string()))?,
    );

    staff.add_key_signature_event(key_sig_event.clone())?;

    repo.save(score)
        .map_err(|e| DomainError::ValidationError(format!("Failed to save: {:?}", e)))?;

    Ok((StatusCode::CREATED, Json(key_sig_event)))
}
