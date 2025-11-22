//! Database repository tests.

#[cfg(test)]
mod tests {
    use crate::db::{UserRepo, ProjectRepo, FileRepo};
    use crate::models::Language;
    use sqlx::PgPool;

    // Note: These tests require a running PostgreSQL instance
    // Run with: cargo test --features test-db

    async fn setup_test_db() -> PgPool {
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://rustyclint:rustyclint@localhost:5432/rustyclint_test".to_string());

        PgPool::connect(&database_url)
            .await
            .expect("Failed to connect to test database")
    }

    #[tokio::test]
    #[ignore] // Requires database
    async fn test_user_creation() {
        let pool = setup_test_db().await;

        let email = format!("test{}@example.com", uuid::Uuid::new_v4());
        let username = format!("user{}", uuid::Uuid::new_v4().to_string()[..8].to_string());

        let user = UserRepo::create(&pool, &email, &username, "password_hash")
            .await
            .expect("Failed to create user");

        assert_eq!(user.email, email);
        assert_eq!(user.username, username);

        // Cleanup
        sqlx::query!("DELETE FROM users WHERE id = $1", user.id)
            .execute(&pool)
            .await
            .unwrap();
    }

    #[tokio::test]
    #[ignore]
    async fn test_email_exists() {
        let pool = setup_test_db().await;

        let email = format!("test{}@example.com", uuid::Uuid::new_v4());
        let username = format!("user{}", uuid::Uuid::new_v4().to_string()[..8].to_string());

        // Should not exist initially
        assert!(!UserRepo::email_exists(&pool, &email).await.unwrap());

        // Create user
        let user = UserRepo::create(&pool, &email, &username, "password_hash")
            .await
            .unwrap();

        // Should exist now
        assert!(UserRepo::email_exists(&pool, &email).await.unwrap());

        // Cleanup
        sqlx::query!("DELETE FROM users WHERE id = $1", user.id)
            .execute(&pool)
            .await
            .unwrap();
    }

    #[tokio::test]
    #[ignore]
    async fn test_project_crud() {
        let pool = setup_test_db().await;

        // Create user first
        let email = format!("test{}@example.com", uuid::Uuid::new_v4());
        let username = format!("user{}", uuid::Uuid::new_v4().to_string()[..8].to_string());
        let user = UserRepo::create(&pool, &email, &username, "password_hash")
            .await
            .unwrap();

        // Create project
        let project = ProjectRepo::create(&pool, "Test Project", user.id, Language::Python)
            .await
            .unwrap();

        assert_eq!(project.name, "Test Project");
        assert_eq!(project.owner_id, user.id);
        assert_eq!(project.default_language, Language::Python);

        // Update project
        let updated = ProjectRepo::update(&pool, project.id, Some("Updated Name"), None)
            .await
            .unwrap();

        assert_eq!(updated.name, "Updated Name");

        // List projects
        let projects = ProjectRepo::list_for_user(&pool, user.id).await.unwrap();
        assert_eq!(projects.len(), 1);

        // Delete project
        ProjectRepo::delete(&pool, project.id).await.unwrap();

        // Cleanup
        sqlx::query!("DELETE FROM users WHERE id = $1", user.id)
            .execute(&pool)
            .await
            .unwrap();
    }

    #[tokio::test]
    #[ignore]
    async fn test_file_operations() {
        let pool = setup_test_db().await;

        // Setup user and project
        let email = format!("test{}@example.com", uuid::Uuid::new_v4());
        let username = format!("user{}", uuid::Uuid::new_v4().to_string()[..8].to_string());
        let user = UserRepo::create(&pool, &email, &username, "password_hash")
            .await
            .unwrap();

        let project = ProjectRepo::create(&pool, "Test Project", user.id, Language::Python)
            .await
            .unwrap();

        // Create file
        let file = FileRepo::upsert(
            &pool,
            project.id,
            "main.py",
            Language::Python,
            "print('hello')",
        )
        .await
        .unwrap();

        assert_eq!(file.path, "main.py");

        // Get file with content
        let (fetched, content) = FileRepo::find_by_id_with_content(&pool, file.id)
            .await
            .unwrap()
            .unwrap();

        assert_eq!(fetched.id, file.id);
        assert_eq!(content, "print('hello')");

        // List files
        let files = FileRepo::list_for_project(&pool, project.id).await.unwrap();
        assert_eq!(files.len(), 1);

        // Cleanup
        ProjectRepo::delete(&pool, project.id).await.unwrap();
        sqlx::query!("DELETE FROM users WHERE id = $1", user.id)
            .execute(&pool)
            .await
            .unwrap();
    }
}
