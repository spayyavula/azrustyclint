//! Database repository layer.

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{File, Language, Project, User};
use crate::{Error, Result};

/// User repository operations.
pub struct UserRepo;

impl UserRepo {
    /// Create a new user.
    pub async fn create(
        pool: &PgPool,
        email: &str,
        username: &str,
        password_hash: &str,
    ) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (email, username, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, email, username, created_at
            "#,
            email,
            username,
            password_hash
        )
        .fetch_one(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        Ok(user)
    }

    /// Find user by email.
    pub async fn find_by_email(pool: &PgPool, email: &str) -> Result<Option<UserWithPassword>> {
        let user = sqlx::query_as!(
            UserWithPassword,
            r#"
            SELECT id, email, username, password_hash, created_at
            FROM users
            WHERE email = $1
            "#,
            email
        )
        .fetch_optional(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        Ok(user)
    }

    /// Find user by ID.
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, username, created_at
            FROM users
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        Ok(user)
    }

    /// Check if email exists.
    pub async fn email_exists(pool: &PgPool, email: &str) -> Result<bool> {
        let exists = sqlx::query_scalar!(
            r#"SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as "exists!""#,
            email
        )
        .fetch_one(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        Ok(exists)
    }

    /// Check if username exists.
    pub async fn username_exists(pool: &PgPool, username: &str) -> Result<bool> {
        let exists = sqlx::query_scalar!(
            r#"SELECT EXISTS(SELECT 1 FROM users WHERE username = $1) as "exists!""#,
            username
        )
        .fetch_one(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        Ok(exists)
    }
}

/// User with password hash for authentication.
pub struct UserWithPassword {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub password_hash: String,
    pub created_at: DateTime<Utc>,
}

/// Project repository operations.
pub struct ProjectRepo;

impl ProjectRepo {
    /// Create a new project.
    pub async fn create(
        pool: &PgPool,
        name: &str,
        owner_id: Uuid,
        default_language: Language,
    ) -> Result<Project> {
        let lang_str = serde_json::to_string(&default_language)
            .map_err(|e| Error::Internal(e.to_string()))?
            .trim_matches('"')
            .to_string();

        let row = sqlx::query!(
            r#"
            INSERT INTO projects (name, owner_id, default_language)
            VALUES ($1, $2, $3)
            RETURNING id, name, owner_id, default_language, created_at, updated_at
            "#,
            name,
            owner_id,
            lang_str
        )
        .fetch_one(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        Ok(Project {
            id: row.id,
            name: row.name,
            owner_id: row.owner_id,
            default_language,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    }

    /// List projects for a user (owned or collaborated).
    pub async fn list_for_user(pool: &PgPool, user_id: Uuid) -> Result<Vec<Project>> {
        let rows = sqlx::query!(
            r#"
            SELECT DISTINCT p.id, p.name, p.owner_id, p.default_language, p.created_at, p.updated_at
            FROM projects p
            LEFT JOIN project_collaborators pc ON p.id = pc.project_id
            WHERE p.owner_id = $1 OR pc.user_id = $1
            ORDER BY p.updated_at DESC
            "#,
            user_id
        )
        .fetch_all(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        let projects = rows
            .into_iter()
            .map(|row| {
                let default_language: Language =
                    serde_json::from_str(&format!("\"{}\"", row.default_language))
                        .unwrap_or(Language::Python);
                Project {
                    id: row.id,
                    name: row.name,
                    owner_id: row.owner_id,
                    default_language,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                }
            })
            .collect();

        Ok(projects)
    }

    /// Get project by ID.
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Project>> {
        let row = sqlx::query!(
            r#"
            SELECT id, name, owner_id, default_language, created_at, updated_at
            FROM projects
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        Ok(row.map(|row| {
            let default_language: Language =
                serde_json::from_str(&format!("\"{}\"", row.default_language))
                    .unwrap_or(Language::Python);
            Project {
                id: row.id,
                name: row.name,
                owner_id: row.owner_id,
                default_language,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }
        }))
    }

    /// Update project.
    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        name: Option<&str>,
        default_language: Option<Language>,
    ) -> Result<Project> {
        let current = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| Error::NotFound("Project not found".into()))?;

        let new_name = name.unwrap_or(&current.name);
        let new_lang = default_language.unwrap_or(current.default_language);
        let lang_str = serde_json::to_string(&new_lang)
            .map_err(|e| Error::Internal(e.to_string()))?
            .trim_matches('"')
            .to_string();

        let row = sqlx::query!(
            r#"
            UPDATE projects
            SET name = $1, default_language = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING id, name, owner_id, default_language, created_at, updated_at
            "#,
            new_name,
            lang_str,
            id
        )
        .fetch_one(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        Ok(Project {
            id: row.id,
            name: row.name,
            owner_id: row.owner_id,
            default_language: new_lang,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    }

    /// Delete project.
    pub async fn delete(pool: &PgPool, id: Uuid) -> Result<()> {
        sqlx::query!("DELETE FROM projects WHERE id = $1", id)
            .execute(pool)
            .await
            .map_err(|e| Error::Database(e.to_string()))?;

        Ok(())
    }

    /// Check if user has access to project.
    pub async fn user_has_access(pool: &PgPool, project_id: Uuid, user_id: Uuid) -> Result<bool> {
        let exists = sqlx::query_scalar!(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2
                UNION
                SELECT 1 FROM project_collaborators WHERE project_id = $1 AND user_id = $2
            ) as "exists!"
            "#,
            project_id,
            user_id
        )
        .fetch_one(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        Ok(exists)
    }
}

/// File repository operations.
pub struct FileRepo;

impl FileRepo {
    /// Create or update a file.
    pub async fn upsert(
        pool: &PgPool,
        project_id: Uuid,
        path: &str,
        language: Language,
        content: &str,
    ) -> Result<File> {
        let lang_str = serde_json::to_string(&language)
            .map_err(|e| Error::Internal(e.to_string()))?
            .trim_matches('"')
            .to_string();

        let row = sqlx::query!(
            r#"
            INSERT INTO files (project_id, path, language, content)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (project_id, path)
            DO UPDATE SET language = $3, content = $4, updated_at = NOW()
            RETURNING id, project_id, path, language, created_at, updated_at
            "#,
            project_id,
            path,
            lang_str,
            content
        )
        .fetch_one(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        Ok(File {
            id: row.id,
            project_id: row.project_id,
            path: row.path,
            language,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    }

    /// List files in a project.
    pub async fn list_for_project(pool: &PgPool, project_id: Uuid) -> Result<Vec<File>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, project_id, path, language, created_at, updated_at
            FROM files
            WHERE project_id = $1
            ORDER BY path
            "#,
            project_id
        )
        .fetch_all(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        let files = rows
            .into_iter()
            .map(|row| {
                let language: Language =
                    serde_json::from_str(&format!("\"{}\"", row.language)).unwrap_or(Language::Python);
                File {
                    id: row.id,
                    project_id: row.project_id,
                    path: row.path,
                    language,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                }
            })
            .collect();

        Ok(files)
    }

    /// Get file by ID with content.
    pub async fn find_by_id_with_content(
        pool: &PgPool,
        id: Uuid,
    ) -> Result<Option<(File, String)>> {
        let row = sqlx::query!(
            r#"
            SELECT id, project_id, path, language, content, created_at, updated_at
            FROM files
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(pool)
        .await
        .map_err(|e| Error::Database(e.to_string()))?;

        Ok(row.map(|row| {
            let language: Language =
                serde_json::from_str(&format!("\"{}\"", row.language)).unwrap_or(Language::Python);
            (
                File {
                    id: row.id,
                    project_id: row.project_id,
                    path: row.path,
                    language,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                },
                row.content.unwrap_or_default(),
            )
        }))
    }

    /// Delete file.
    pub async fn delete(pool: &PgPool, id: Uuid) -> Result<()> {
        sqlx::query!("DELETE FROM files WHERE id = $1", id)
            .execute(pool)
            .await
            .map_err(|e| Error::Database(e.to_string()))?;

        Ok(())
    }
}
