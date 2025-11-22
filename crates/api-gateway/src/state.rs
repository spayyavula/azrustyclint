//! Application state management.

use std::sync::Arc;

use sqlx::PgPool;

use crate::config::Config;

/// Shared application state.
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: redis::aio::ConnectionManager,
    pub config: Arc<Config>,
}

impl AppState {
    pub async fn new(config: &Config) -> anyhow::Result<Self> {
        // Connect to PostgreSQL
        let db = PgPool::connect(&config.database_url).await?;
        tracing::info!("Connected to PostgreSQL");

        // Connect to Redis
        let redis_client = redis::Client::open(config.redis_url.as_str())?;
        let redis = redis::aio::ConnectionManager::new(redis_client).await?;
        tracing::info!("Connected to Redis");

        Ok(Self {
            db,
            redis,
            config: Arc::new(Config {
                port: config.port,
                database_url: config.database_url.clone(),
                redis_url: config.redis_url.clone(),
                jwt_secret: config.jwt_secret.clone(),
                jwt_expiry_hours: config.jwt_expiry_hours,
                sandbox_timeout_secs: config.sandbox_timeout_secs,
                max_containers_per_user: config.max_containers_per_user,
            }),
        })
    }
}
