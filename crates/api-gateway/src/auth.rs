//! Authentication and authorization.

use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::state::AppState;

/// JWT claims structure.
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub email: String,
    pub exp: usize,
    pub iat: usize,
}

/// Authenticated user extracted from JWT.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub email: String,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AuthError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .ok_or(AuthError::MissingToken)?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or(AuthError::InvalidToken)?;

        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|_| AuthError::InvalidToken)?;

        Ok(AuthUser {
            id: token_data.claims.sub,
            email: token_data.claims.email,
        })
    }
}

/// Create a new JWT token for a user.
pub fn create_token(
    user_id: Uuid,
    email: &str,
    secret: &str,
    expiry_hours: u64,
) -> Result<String, jsonwebtoken::errors::Error> {
    let now = chrono::Utc::now();
    let exp = (now + chrono::Duration::hours(expiry_hours as i64)).timestamp() as usize;

    let claims = Claims {
        sub: user_id,
        email: email.to_string(),
        exp,
        iat: now.timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

/// Authentication errors.
#[derive(Debug)]
pub enum AuthError {
    MissingToken,
    InvalidToken,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AuthError::MissingToken => (StatusCode::UNAUTHORIZED, "Missing authentication token"),
            AuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid authentication token"),
        };

        (status, Json(serde_json::json!({ "error": message }))).into_response()
    }
}
