//! File management routes.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use rustyclint_common::{
    db::{FileRepo, ProjectRepo},
    models::Language,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{auth::AuthUser, state::AppState};

#[derive(Deserialize)]
pub struct CreateFileRequest {
    pub project_id: Uuid,
    pub path: String,
    pub language: Language,
    pub content: String,
}

#[derive(Deserialize)]
pub struct UpdateFileRequest {
    pub content: String,
}

#[derive(Serialize)]
pub struct FileResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub path: String,
    pub language: Language,
    pub content: String,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<CreateFileRequest>,
) -> Result<(StatusCode, Json<FileResponse>), (StatusCode, Json<ErrorResponse>)> {
    // Check project access
    if !ProjectRepo::user_has_access(&state.db, body.project_id, user.id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            )
        })?
    {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ErrorResponse {
                error: "Access denied".into(),
            }),
        ));
    }

    // Validate path
    if body.path.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "File path cannot be empty".into(),
            }),
        ));
    }

    // Prevent path traversal
    if body.path.contains("..") {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Invalid file path".into(),
            }),
        ));
    }

    let file = FileRepo::upsert(
        &state.db,
        body.project_id,
        &body.path,
        body.language,
        &body.content,
    )
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )
    })?;

    Ok((
        StatusCode::CREATED,
        Json(FileResponse {
            id: file.id,
            project_id: file.project_id,
            path: file.path,
            language: file.language,
            content: body.content,
        }),
    ))
}

pub async fn get(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<FileResponse>, (StatusCode, Json<ErrorResponse>)> {
    let (file, content) = FileRepo::find_by_id_with_content(&state.db, id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ErrorResponse {
                    error: "File not found".into(),
                }),
            )
        })?;

    // Check project access
    if !ProjectRepo::user_has_access(&state.db, file.project_id, user.id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            )
        })?
    {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ErrorResponse {
                error: "Access denied".into(),
            }),
        ));
    }

    Ok(Json(FileResponse {
        id: file.id,
        project_id: file.project_id,
        path: file.path,
        language: file.language,
        content,
    }))
}

pub async fn update(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateFileRequest>,
) -> Result<Json<FileResponse>, (StatusCode, Json<ErrorResponse>)> {
    let (file, _) = FileRepo::find_by_id_with_content(&state.db, id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ErrorResponse {
                    error: "File not found".into(),
                }),
            )
        })?;

    // Check project access
    if !ProjectRepo::user_has_access(&state.db, file.project_id, user.id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            )
        })?
    {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ErrorResponse {
                error: "Access denied".into(),
            }),
        ));
    }

    // Update file content
    let updated = FileRepo::upsert(
        &state.db,
        file.project_id,
        &file.path,
        file.language,
        &body.content,
    )
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )
    })?;

    Ok(Json(FileResponse {
        id: updated.id,
        project_id: updated.project_id,
        path: updated.path,
        language: updated.language,
        content: body.content,
    }))
}

pub async fn delete(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    let (file, _) = FileRepo::find_by_id_with_content(&state.db, id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ErrorResponse {
                    error: "File not found".into(),
                }),
            )
        })?;

    // Check project access
    if !ProjectRepo::user_has_access(&state.db, file.project_id, user.id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            )
        })?
    {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ErrorResponse {
                error: "Access denied".into(),
            }),
        ));
    }

    FileRepo::delete(&state.db, id).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )
    })?;

    Ok(StatusCode::NO_CONTENT)
}
