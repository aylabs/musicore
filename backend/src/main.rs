use musicore_backend::adapters::api::routes::create_router;
use musicore_backend::adapters::persistence::in_memory::InMemoryScoreRepository;
use std::sync::Arc;

#[tokio::main]
async fn main() {
    // Initialize in-memory repository
    let repository = Arc::new(InMemoryScoreRepository::new());

    // Create router with shared state
    let app = create_router(repository);

    // Bind to port 8080
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .expect("Failed to bind to port 8080");

    println!("Musicore backend server listening on http://0.0.0.0:8080");
    println!("API endpoints available at http://0.0.0.0:8080/api/v1/scores");

    // Run server
    axum::serve(listener, app)
        .await
        .expect("Server failed to start");
}
