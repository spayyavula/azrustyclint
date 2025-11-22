//! Code execution sandbox routes.

use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use rustyclint_common::models::Language;
use rustyclint_sandbox::{ExecutionRequest, ResourceLimits, SandboxExecutor};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::{auth::AuthUser, state::AppState};

#[derive(Deserialize)]
pub struct RunCodeRequest {
    pub code: String,
    pub language: Language,
    pub stdin: Option<String>,
}

#[derive(Serialize)]
pub struct RunCodeResponse {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i64,
    pub execution_time_ms: u64,
    pub timed_out: bool,
}

#[derive(Serialize)]
pub struct SessionResponse {
    pub id: Uuid,
    pub language: Language,
    pub created_at: String,
    pub expires_at: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

// Lazy-initialized executor
static EXECUTOR: std::sync::OnceLock<Arc<Mutex<Option<SandboxExecutor>>>> = std::sync::OnceLock::new();

fn get_executor() -> &'static Arc<Mutex<Option<SandboxExecutor>>> {
    EXECUTOR.get_or_init(|| Arc::new(Mutex::new(None)))
}

pub async fn run_code(
    State(_state): State<AppState>,
    _user: AuthUser,
    Json(body): Json<RunCodeRequest>,
) -> Result<Json<RunCodeResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Validate code size
    if body.code.len() > 100_000 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Code too large (max 100KB)".into(),
            }),
        ));
    }

    if body.code.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Code cannot be empty".into(),
            }),
        ));
    }

    // Initialize executor if needed
    let executor_lock = get_executor();
    let mut executor_guard = executor_lock.lock().await;

    if executor_guard.is_none() {
        *executor_guard = Some(
            SandboxExecutor::with_limits(ResourceLimits::snippet()).map_err(|e| {
                (
                    StatusCode::SERVICE_UNAVAILABLE,
                    Json(ErrorResponse {
                        error: format!("Sandbox unavailable: {}", e),
                    }),
                )
            })?,
        );
    }

    let executor = executor_guard.as_ref().unwrap();

    // Execute code
    let request = ExecutionRequest {
        code: body.code,
        language: body.language,
        stdin: body.stdin,
        args: vec![],
    };

    // Note: In production, you'd want to use a pool of executors
    // and implement proper rate limiting per user
    let result = executor.execute(request).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Execution failed: {}", e),
            }),
        )
    })?;

    Ok(Json(RunCodeResponse {
        stdout: result.stdout,
        stderr: result.stderr,
        exit_code: result.exit_code,
        execution_time_ms: result.execution_time_ms,
        timed_out: result.timed_out,
    }))
}

pub async fn list_sessions(
    State(_state): State<AppState>,
    _user: AuthUser,
) -> Result<Json<Vec<SessionResponse>>, (StatusCode, Json<ErrorResponse>)> {
    // TODO: Query sandbox_sessions table for active user sessions
    // For now, return empty list since we're using ephemeral containers
    Ok(Json(vec![]))
}

pub async fn stop_session(
    State(_state): State<AppState>,
    _user: AuthUser,
    Path(_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    // TODO: Implement session management
    // 1. Verify session belongs to user
    // 2. Stop the container
    // 3. Remove from database
    Err((
        StatusCode::NOT_IMPLEMENTED,
        Json(ErrorResponse {
            error: "Session management not yet implemented".into(),
        }),
    ))
}
