use axum::{
    Router,
    routing::{delete, get, post},
};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use super::handlers::{
    AppState, add_clef_event, add_instrument, add_key_signature_event, add_note, add_staff,
    add_tempo_event, add_time_signature_event, add_voice, create_score, delete_score, get_score,
    list_scores,
};
use super::import::import_musicxml;

/// Create the main application router with all API routes
pub fn create_router(state: AppState) -> Router {
    Router::new()
        // Score operations
        .route("/api/v1/scores", post(create_score))
        .route("/api/v1/scores", get(list_scores))
        .route("/api/v1/scores/:score_id", get(get_score))
        .route("/api/v1/scores/:score_id", delete(delete_score))
        // MusicXML import
        .route("/api/v1/scores/import-musicxml", post(import_musicxml))
        // Instrument operations
        .route("/api/v1/scores/:score_id/instruments", post(add_instrument))
        // Staff operations
        .route("/api/v1/scores/:score_id/instruments/:instrument_id/staves", post(add_staff))
        // Voice operations
        .route("/api/v1/scores/:score_id/instruments/:instrument_id/staves/:staff_id/voices", post(add_voice))
        // Note operations
        .route("/api/v1/scores/:score_id/instruments/:instrument_id/staves/:staff_id/voices/:voice_id/notes", post(add_note))
        // Global structural events
        .route("/api/v1/scores/:score_id/structural-events/tempo", post(add_tempo_event))
        .route("/api/v1/scores/:score_id/structural-events/time-signature", post(add_time_signature_event))
        // Staff-scoped structural events
        .route("/api/v1/scores/:score_id/instruments/:instrument_id/staves/:staff_id/structural-events/clef", post(add_clef_event))
        .route("/api/v1/scores/:score_id/instruments/:instrument_id/staves/:staff_id/structural-events/key-signature", post(add_key_signature_event))
        // Middleware
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state)
}
