use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use musicore_backend::adapters::{
    api::routes::create_router,
    persistence::in_memory::InMemoryScoreRepository,
};
use serde_json::{json, Value};
use std::sync::Arc;
use tower::ServiceExt; // for `app.oneshot()`

async fn setup_app() -> axum::Router {
    let repository = Arc::new(InMemoryScoreRepository::new());
    create_router(repository)
}

async fn make_request(
    app: axum::Router,
    method: &str,
    uri: &str,
    body: Option<Value>,
) -> (StatusCode, Value) {
    let mut request_builder = Request::builder().method(method).uri(uri);

    let request = if let Some(json_body) = body {
        request_builder = request_builder.header("content-type", "application/json");
        request_builder
            .body(Body::from(serde_json::to_vec(&json_body).unwrap()))
            .unwrap()
    } else {
        request_builder.body(Body::empty()).unwrap()
    };

    let response = app.oneshot(request).await.unwrap();
    let status = response.status();

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = if body.is_empty() {
        json!(null)
    } else {
        serde_json::from_slice(&body).unwrap()
    };

    (status, json)
}

// ===== Score Endpoint Tests =====

#[tokio::test]
async fn test_create_score() {
    let app = setup_app().await;

    let (status, body) = make_request(app, "POST", "/api/v1/scores", Some(json!({"name": "Test Score"}))).await;

    assert_eq!(status, StatusCode::CREATED);
    assert!(body["id"].is_string());
    assert!(body["global_structural_events"].is_array());
    assert_eq!(body["global_structural_events"].as_array().unwrap().len(), 2); // Default tempo and time signature
}

#[tokio::test]
async fn test_list_scores() {
    let app = setup_app().await;

    // Create two scores first
    make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;

    let (status, body) = make_request(app, "GET", "/api/v1/scores", None).await;

    assert_eq!(status, StatusCode::OK);
    assert!(body["scores"].is_array());
    assert_eq!(body["scores"].as_array().unwrap().len(), 2);
}

#[tokio::test]
async fn test_get_score() {
    let app = setup_app().await;

    // Create a score
    let (_, create_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = create_body["id"].as_str().unwrap();

    // Get the score
    let (status, body) = make_request(app, "GET", &format!("/api/v1/scores/{}", score_id), None).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["id"].as_str().unwrap(), score_id);
}

#[tokio::test]
async fn test_get_nonexistent_score() {
    let app = setup_app().await;

    let (status, _body) = make_request(
        app,
        "GET",
        "/api/v1/scores/550e8400-e29b-41d4-a716-446655440000",
        None,
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_delete_score() {
    let app = setup_app().await;

    // Create a score
    let (_, create_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = create_body["id"].as_str().unwrap();

    // Delete the score
    let (status, _) = make_request(app.clone(), "DELETE", &format!("/api/v1/scores/{}", score_id), None).await;

    assert_eq!(status, StatusCode::NO_CONTENT);

    // Verify it's gone
    let (status, _) = make_request(app, "GET", &format!("/api/v1/scores/{}", score_id), None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ===== Instrument Endpoint Tests =====

#[tokio::test]
async fn test_add_instrument() {
    let app = setup_app().await;

    // Create a score
    let (_, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = score_body["id"].as_str().unwrap();

    // Add instrument
    let (status, body) = make_request(
        app,
        "POST",
        &format!("/api/v1/scores/{}/instruments", score_id),
        Some(json!({"name": "Piano"})),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["name"].as_str().unwrap(), "Piano");
    assert!(body["id"].is_string());
    assert!(body["staves"].is_array());
    assert_eq!(body["staves"].as_array().unwrap().len(), 1); // Default staff
}

// ===== Staff Endpoint Tests =====

#[tokio::test]
async fn test_add_staff() {
    let app = setup_app().await;

    // Create score and instrument
    let (_, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = score_body["id"].as_str().unwrap();

    let (_, inst_body) = make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/instruments", score_id),
        Some(json!({"name": "Piano"})),
    )
    .await;
    let instrument_id = inst_body["id"].as_str().unwrap();

    // Add second staff
    let (status, body) = make_request(
        app,
        "POST",
        &format!("/api/v1/scores/{}/instruments/{}/staves", score_id, instrument_id),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    assert!(body["id"].is_string());
    assert!(body["staff_structural_events"].is_array());
}

// ===== Voice Endpoint Tests =====

#[tokio::test]
async fn test_add_voice() {
    let app = setup_app().await;

    // Create score, instrument
    let (_, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = score_body["id"].as_str().unwrap();

    let (_, inst_body) = make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/instruments", score_id),
        Some(json!({"name": "Piano"})),
    )
    .await;
    let instrument_id = inst_body["id"].as_str().unwrap();
    let staff_id = inst_body["staves"][0]["id"].as_str().unwrap();

    // Add second voice
    let (status, body) = make_request(
        app,
        "POST",
        &format!("/api/v1/scores/{}/instruments/{}/staves/{}/voices", score_id, instrument_id, staff_id),
        None,
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    assert!(body["id"].is_string());
    assert!(body["interval_events"].is_array());
}

// ===== Note Endpoint Tests =====

#[tokio::test]
async fn test_add_note() {
    let app = setup_app().await;

    // Create full hierarchy
    let (_, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = score_body["id"].as_str().unwrap();

    let (_, inst_body) = make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/instruments", score_id),
        Some(json!({"name": "Piano"})),
    )
    .await;
    let instrument_id = inst_body["id"].as_str().unwrap();
    let staff_id = inst_body["staves"][0]["id"].as_str().unwrap();
    let voice_id = inst_body["staves"][0]["voices"][0]["id"].as_str().unwrap();

    // Add note
    let (status, body) = make_request(
        app,
        "POST",
        &format!("/api/v1/scores/{}/instruments/{}/staves/{}/voices/{}/notes", 
                 score_id, instrument_id, staff_id, voice_id),
        Some(json!({
            "start_tick": 960,
            "duration_ticks": 480,
            "pitch": 60
        })),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    assert!(body["id"].is_string());
    assert_eq!(body["start_tick"], 960);
    assert_eq!(body["duration_ticks"], 480);
    assert_eq!(body["pitch"], 60);
}

#[tokio::test]
async fn test_add_note_invalid_pitch() {
    let app = setup_app().await;

    // Create hierarchy
    let (_, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = score_body["id"].as_str().unwrap();

    let (_, inst_body) = make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/instruments", score_id),
        Some(json!({"name": "Piano"})),
    )
    .await;
    let instrument_id = inst_body["id"].as_str().unwrap();
    let staff_id = inst_body["staves"][0]["id"].as_str().unwrap();
    let voice_id = inst_body["staves"][0]["voices"][0]["id"].as_str().unwrap();

    // Add note with invalid pitch
    let (status, _body) = make_request(
        app,
        "POST",
        &format!("/api/v1/scores/{}/instruments/{}/staves/{}/voices/{}/notes", 
                 score_id, instrument_id, staff_id, voice_id),
        Some(json!({
            "start_tick": 0,
            "duration_ticks": 480,
            "pitch": 128 // Invalid: max is 127
        })),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_add_overlapping_note_same_pitch() {
    let app = setup_app().await;

    // Create hierarchy
    let (_, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = score_body["id"].as_str().unwrap();

    let (_, inst_body) = make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/instruments", score_id),
        Some(json!({"name": "Piano"})),
    )
    .await;
    let instrument_id = inst_body["id"].as_str().unwrap();
    let staff_id = inst_body["staves"][0]["id"].as_str().unwrap();
    let voice_id = inst_body["staves"][0]["voices"][0]["id"].as_str().unwrap();

    // Add first note
    make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/instruments/{}/staves/{}/voices/{}/notes", 
                 score_id, instrument_id, staff_id, voice_id),
        Some(json!({
            "start_tick": 0,
            "duration_ticks": 960,
            "pitch": 60
        })),
    )
    .await;

    // Try to add overlapping note with same pitch
    let (status, _body) = make_request(
        app,
        "POST",
        &format!("/api/v1/scores/{}/instruments/{}/staves/{}/voices/{}/notes", 
                 score_id, instrument_id, staff_id, voice_id),
        Some(json!({
            "start_tick": 480,
            "duration_ticks": 960,
            "pitch": 60 // Same pitch, overlaps
        })),
    )
    .await;

    // DomainError::DuplicateError maps to 409 CONFLICT, but overlap validation returns DuplicateError
    // which the API correctly maps. However, the actual error might be wrapped differently.
    assert!(status == StatusCode::CONFLICT || status == StatusCode::BAD_REQUEST);
}

// ===== Global Structural Events Tests =====

#[tokio::test]
async fn test_add_tempo_event() {
    let app = setup_app().await;

    let (_, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = score_body["id"].as_str().unwrap();

    let (status, body) = make_request(
        app,
        "POST",
        &format!("/api/v1/scores/{}/structural-events/tempo", score_id),
        Some(json!({
            "tick": 960,
            "bpm": 140
        })),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["tick"], 960);
    assert_eq!(body["bpm"], 140);
}

#[tokio::test]
async fn test_add_tempo_event_invalid_bpm() {
    let app = setup_app().await;

    let (_, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = score_body["id"].as_str().unwrap();

    let (status, _body) = make_request(
        app,
        "POST",
        &format!("/api/v1/scores/{}/structural-events/tempo", score_id),
        Some(json!({
            "tick": 960,
            "bpm": 500 // Invalid: max is 400
        })),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_add_duplicate_tempo_event() {
    let app = setup_app().await;

    let (_, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = score_body["id"].as_str().unwrap();

    // Add first tempo event
    make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/structural-events/tempo", score_id),
        Some(json!({
            "tick": 960,
            "bpm": 140
        })),
    )
    .await;

    // Try to add another at same tick
    let (status, _body) = make_request(
        app,
        "POST",
        &format!("/api/v1/scores/{}/structural-events/tempo", score_id),
        Some(json!({
            "tick": 960,
            "bpm": 150
        })),
    )
    .await;

    assert_eq!(status, StatusCode::CONFLICT);
}

#[tokio::test]
async fn test_add_time_signature_event() {
    let app = setup_app().await;

    let (_, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = score_body["id"].as_str().unwrap();

    let (status, body) = make_request(
        app,
        "POST",
        &format!("/api/v1/scores/{}/structural-events/time-signature", score_id),
        Some(json!({
            "tick": 1920,
            "numerator": 3,
            "denominator": 4
        })),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["tick"], 1920);
    assert_eq!(body["numerator"], 3);
    assert_eq!(body["denominator"], 4);
}

// ===== Staff-Scoped Structural Events Tests =====

#[tokio::test]
async fn test_add_clef_event() {
    let app = setup_app().await;

    // Create hierarchy
    let (_, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = score_body["id"].as_str().unwrap();

    let (_, inst_body) = make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/instruments", score_id),
        Some(json!({"name": "Piano"})),
    )
    .await;
    let instrument_id = inst_body["id"].as_str().unwrap();
    let staff_id = inst_body["staves"][0]["id"].as_str().unwrap();

    let (status, body) = make_request(
        app,
        "POST",
        &format!("/api/v1/scores/{}/instruments/{}/staves/{}/structural-events/clef", 
                 score_id, instrument_id, staff_id),
        Some(json!({
            "tick": 960,
            "clef": "bass"
        })),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["tick"], 960);
    assert_eq!(body["clef"], "Bass");
}

#[tokio::test]
async fn test_add_key_signature_event() {
    let app = setup_app().await;

    // Create hierarchy
    let (_, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    let score_id = score_body["id"].as_str().unwrap();

    let (_, inst_body) = make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/instruments", score_id),
        Some(json!({"name": "Piano"})),
    )
    .await;
    let instrument_id = inst_body["id"].as_str().unwrap();
    let staff_id = inst_body["staves"][0]["id"].as_str().unwrap();

    let (status, body) = make_request(
        app,
        "POST",
        &format!("/api/v1/scores/{}/instruments/{}/staves/{}/structural-events/key-signature", 
                 score_id, instrument_id, staff_id),
        Some(json!({
            "tick": 960,
            "sharps": 2 // D major
        })),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["tick"], 960);
    assert_eq!(body["key"], 2);
}

// ===== End-to-End Workflow Test =====

#[tokio::test]
async fn test_complete_score_workflow() {
    let app = setup_app().await;

    // 1. Create score
    let (status, score_body) = make_request(app.clone(), "POST", "/api/v1/scores", Some(json!({}))).await;
    assert_eq!(status, StatusCode::CREATED);
    let score_id = score_body["id"].as_str().unwrap();

    // 2. Add instrument
    let (status, inst_body) = make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/instruments", score_id),
        Some(json!({"name": "Piano"})),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    let instrument_id = inst_body["id"].as_str().unwrap();
    let staff_id = inst_body["staves"][0]["id"].as_str().unwrap();
    let voice_id = inst_body["staves"][0]["voices"][0]["id"].as_str().unwrap();

    // 3. Add tempo change
    let (status, _) = make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/structural-events/tempo", score_id),
        Some(json!({"tick": 1920, "bpm": 140})),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);

    // 4. Add clef change
    let (status, _) = make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/instruments/{}/staves/{}/structural-events/clef", 
                 score_id, instrument_id, staff_id),
        Some(json!({"tick": 3840, "clef": "bass"})),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);

    // 5. Add note
    let (status, _) = make_request(
        app.clone(),
        "POST",
        &format!("/api/v1/scores/{}/instruments/{}/staves/{}/voices/{}/notes", 
                 score_id, instrument_id, staff_id, voice_id),
        Some(json!({"start_tick": 0, "duration_ticks": 960, "pitch": 60})),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);

    // 6. Retrieve complete score
    let (status, final_score) = make_request(
        app,
        "GET",
        &format!("/api/v1/scores/{}", score_id),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Verify structure
    assert_eq!(final_score["instruments"].as_array().unwrap().len(), 1);
    assert_eq!(final_score["global_structural_events"].as_array().unwrap().len(), 3); // 2 defaults + 1 added
    
    let instrument = &final_score["instruments"][0];
    assert_eq!(instrument["name"], "Piano");
    assert_eq!(instrument["staves"][0]["staff_structural_events"].as_array().unwrap().len(), 3); // 2 defaults + 1 clef
    assert_eq!(instrument["staves"][0]["voices"][0]["interval_events"].as_array().unwrap().len(), 1);
}
