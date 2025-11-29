//! Domain models for RustyClint.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Supported programming languages.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    Rust,
    Python,
    JavaScript,
    TypeScript,
    Go,
    Java,
    CSharp,
    Cpp,
    C,
    Ruby,
    Php,
    Swift,
    Kotlin,
}

impl Language {
    /// Get the file extension for this language.
    pub fn extension(&self) -> &'static str {
        match self {
            Language::Rust => "rs",
            Language::Python => "py",
            Language::JavaScript => "js",
            Language::TypeScript => "ts",
            Language::Go => "go",
            Language::Java => "java",
            Language::CSharp => "cs",
            Language::Cpp => "cpp",
            Language::C => "c",
            Language::Ruby => "rb",
            Language::Php => "php",
            Language::Swift => "swift",
            Language::Kotlin => "kt",
        }
    }

    /// Get the Docker image for this language's sandbox.
    /// Images are hosted in Azure Container Registry.
    pub fn docker_image(&self) -> &'static str {
        match self {
            Language::Rust => "acrustyclintprod.azurecr.io/sandbox-rust:latest",
            Language::Python => "acrustyclintprod.azurecr.io/sandbox-python:latest",
            Language::JavaScript | Language::TypeScript => "acrustyclintprod.azurecr.io/sandbox-node:latest",
            Language::Go => "acrustyclintprod.azurecr.io/sandbox-go:latest",
            Language::Java => "acrustyclintprod.azurecr.io/sandbox-java:latest",
            Language::CSharp => "acrustyclintprod.azurecr.io/sandbox-dotnet:latest",
            Language::Cpp | Language::C => "acrustyclintprod.azurecr.io/sandbox-cpp:latest",
            Language::Ruby => "acrustyclintprod.azurecr.io/sandbox-ruby:latest",
            Language::Php => "acrustyclintprod.azurecr.io/sandbox-php:latest",
            Language::Swift => "acrustyclintprod.azurecr.io/sandbox-swift:latest",
            Language::Kotlin => "acrustyclintprod.azurecr.io/sandbox-kotlin:latest",
        }
    }
}

/// A user in the system.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub created_at: DateTime<Utc>,
}

/// A collaborative project/workspace.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: Uuid,
    pub name: String,
    pub owner_id: Uuid,
    pub default_language: Language,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// A file within a project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct File {
    pub id: Uuid,
    pub project_id: Uuid,
    pub path: String,
    pub language: Language,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Session for a user's sandbox environment.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub project_id: Uuid,
    pub container_id: String,
    pub language: Language,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

/// Collaboration session for real-time editing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollabSession {
    pub id: Uuid,
    pub file_id: Uuid,
    pub participants: Vec<Uuid>,
    pub created_at: DateTime<Utc>,
}
