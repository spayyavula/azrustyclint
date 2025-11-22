//! Project management routes.

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
pub struct CreateProjectRequest {
    pub name: String,
    pub default_language: Language,
}

#[derive(Deserialize)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub default_language: Option<Language>,
}

#[derive(Serialize)]
pub struct ProjectResponse {
    pub id: Uuid,
    pub name: String,
    pub owner_id: Uuid,
    pub default_language: Language,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
pub struct FileResponse {
    pub id: Uuid,
    pub path: String,
    pub language: Language,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

pub async fn list(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<ProjectResponse>>, (StatusCode, Json<ErrorResponse>)> {
    let projects = ProjectRepo::list_for_user(&state.db, user.id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            )
        })?;

    let response: Vec<ProjectResponse> = projects
        .into_iter()
        .map(|p| ProjectResponse {
            id: p.id,
            name: p.name,
            owner_id: p.owner_id,
            default_language: p.default_language,
            created_at: p.created_at.to_rfc3339(),
            updated_at: p.updated_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(response))
}

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<CreateProjectRequest>,
) -> Result<(StatusCode, Json<ProjectResponse>), (StatusCode, Json<ErrorResponse>)> {
    // Validate name
    if body.name.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Project name cannot be empty".into(),
            }),
        ));
    }

    if body.name.len() > 255 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Project name too long".into(),
            }),
        ));
    }

    let project = ProjectRepo::create(&state.db, &body.name, user.id, body.default_language)
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
        Json(ProjectResponse {
            id: project.id,
            name: project.name,
            owner_id: project.owner_id,
            default_language: project.default_language,
            created_at: project.created_at.to_rfc3339(),
            updated_at: project.updated_at.to_rfc3339(),
        }),
    ))
}

pub async fn get(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ProjectResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Check access
    if !ProjectRepo::user_has_access(&state.db, id, user.id)
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

    let project = ProjectRepo::find_by_id(&state.db, id)
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
                    error: "Project not found".into(),
                }),
            )
        })?;

    Ok(Json(ProjectResponse {
        id: project.id,
        name: project.name,
        owner_id: project.owner_id,
        default_language: project.default_language,
        created_at: project.created_at.to_rfc3339(),
        updated_at: project.updated_at.to_rfc3339(),
    }))
}

pub async fn update(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateProjectRequest>,
) -> Result<Json<ProjectResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Check ownership (only owner can update)
    let project = ProjectRepo::find_by_id(&state.db, id)
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
                    error: "Project not found".into(),
                }),
            )
        })?;

    if project.owner_id != user.id {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ErrorResponse {
                error: "Only the owner can update this project".into(),
            }),
        ));
    }

    // Validate name if provided
    if let Some(ref name) = body.name {
        if name.trim().is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Project name cannot be empty".into(),
                }),
            ));
        }
    }

    let updated = ProjectRepo::update(
        &state.db,
        id,
        body.name.as_deref(),
        body.default_language,
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

    Ok(Json(ProjectResponse {
        id: updated.id,
        name: updated.name,
        owner_id: updated.owner_id,
        default_language: updated.default_language,
        created_at: updated.created_at.to_rfc3339(),
        updated_at: updated.updated_at.to_rfc3339(),
    }))
}

pub async fn delete(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    // Check ownership
    let project = ProjectRepo::find_by_id(&state.db, id)
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
                    error: "Project not found".into(),
                }),
            )
        })?;

    if project.owner_id != user.id {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ErrorResponse {
                error: "Only the owner can delete this project".into(),
            }),
        ));
    }

    ProjectRepo::delete(&state.db, id).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )
    })?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_files(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<FileResponse>>, (StatusCode, Json<ErrorResponse>)> {
    // Check access
    if !ProjectRepo::user_has_access(&state.db, id, user.id)
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

    let files = FileRepo::list_for_project(&state.db, id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            )
        })?;

    let response: Vec<FileResponse> = files
        .into_iter()
        .map(|f| FileResponse {
            id: f.id,
            path: f.path,
            language: f.language,
        })
        .collect();

    Ok(Json(response))
}
