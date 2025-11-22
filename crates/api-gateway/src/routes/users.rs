//! User authentication and management routes.

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{extract::State, http::StatusCode, Json};
use rustyclint_common::db::UserRepo;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    auth::{create_token, AuthUser},
    state::AppState,
};

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub username: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), (StatusCode, Json<ErrorResponse>)> {
    // Validate input
    if body.email.is_empty() || !body.email.contains('@') {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Invalid email address".into(),
            }),
        ));
    }

    if body.username.len() < 3 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Username must be at least 3 characters".into(),
            }),
        ));
    }

    if body.password.len() < 8 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Password must be at least 8 characters".into(),
            }),
        ));
    }

    // Check if email exists
    if UserRepo::email_exists(&state.db, &body.email)
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
            StatusCode::CONFLICT,
            Json(ErrorResponse {
                error: "Email already registered".into(),
            }),
        ));
    }

    // Check if username exists
    if UserRepo::username_exists(&state.db, &body.username)
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
            StatusCode::CONFLICT,
            Json(ErrorResponse {
                error: "Username already taken".into(),
            }),
        ));
    }

    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(body.password.as_bytes(), &salt)
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Password hashing failed: {}", e),
                }),
            )
        })?
        .to_string();

    // Create user
    let user = UserRepo::create(&state.db, &body.email, &body.username, &password_hash)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            )
        })?;

    // Generate token
    let token = create_token(
        user.id,
        &user.email,
        &state.config.jwt_secret,
        state.config.jwt_expiry_hours,
    )
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Token generation failed: {}", e),
            }),
        )
    })?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            token,
            user: UserResponse {
                id: user.id,
                email: user.email,
                username: user.username,
            },
        }),
    ))
}

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Find user by email
    let user = UserRepo::find_by_email(&state.db, &body.email)
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
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    error: "Invalid email or password".into(),
                }),
            )
        })?;

    // Verify password
    let parsed_hash = PasswordHash::new(&user.password_hash).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Password verification failed: {}", e),
            }),
        )
    })?;

    Argon2::default()
        .verify_password(body.password.as_bytes(), &parsed_hash)
        .map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    error: "Invalid email or password".into(),
                }),
            )
        })?;

    // Generate token
    let token = create_token(
        user.id,
        &user.email,
        &state.config.jwt_secret,
        state.config.jwt_expiry_hours,
    )
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Token generation failed: {}", e),
            }),
        )
    })?;

    Ok(Json(AuthResponse {
        token,
        user: UserResponse {
            id: user.id,
            email: user.email,
            username: user.username,
        },
    }))
}

pub async fn me(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<UserResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Fetch full user info from database
    let db_user = UserRepo::find_by_id(&state.db, user.id)
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
                    error: "User not found".into(),
                }),
            )
        })?;

    Ok(Json(UserResponse {
        id: db_user.id,
        email: db_user.email,
        username: db_user.username,
    }))
}
