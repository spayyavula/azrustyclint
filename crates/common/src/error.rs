//! Error types for RustyClint.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Authentication failed: {0}")]
    Auth(String),

    #[error("Authorization denied: {0}")]
    Forbidden(String),

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Sandbox error: {0}")]
    Sandbox(String),

    #[error("Collaboration error: {0}")]
    Collaboration(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

pub type Result<T> = std::result::Result<T, Error>;
