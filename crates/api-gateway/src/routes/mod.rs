//! API route definitions.

use axum::{
    routing::{get, post},
    Json, Router,
};
use serde_json::{json, Value};

use crate::state::AppState;

mod files;
mod projects;
mod sandbox;
mod users;
mod ws;

/// Health check endpoint.
pub async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "healthy",
        "service": "rustyclint",
        "version": env!("CARGO_PKG_VERSION")
    }))
}

/// API v1 routes.
pub fn api_routes() -> Router<AppState> {
    Router::new()
        // Auth routes
        .route("/auth/register", post(users::register))
        .route("/auth/login", post(users::login))
        .route("/auth/me", get(users::me))
        // Project routes
        .route("/projects", get(projects::list).post(projects::create))
        .route(
            "/projects/:id",
            get(projects::get)
                .put(projects::update)
                .delete(projects::delete),
        )
        .route("/projects/:id/files", get(projects::list_files))
        // File routes
        .route("/files", post(files::create))
        .route(
            "/files/:id",
            get(files::get)
                .put(files::update)
                .delete(files::delete),
        )
        // Sandbox routes
        .route("/sandbox/run", post(sandbox::run_code))
        .route("/sandbox/sessions", get(sandbox::list_sessions))
        .route("/sandbox/sessions/:id", delete(sandbox::stop_session))
}

/// WebSocket routes for real-time features.
pub fn ws_routes() -> Router<AppState> {
    Router::new()
        .route("/collab/:file_id", get(ws::collab_handler))
        .route("/terminal/:session_id", get(ws::terminal_handler))
        .route("/signaling/:room_id", get(ws::signaling_handler))
}

// Re-export handlers
use axum::routing::delete;
