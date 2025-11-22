//! Configuration management for RustyClint.

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Config {
    #[serde(default = "default_port")]
    pub port: u16,

    pub database_url: String,
    pub redis_url: String,

    pub jwt_secret: String,

    #[serde(default = "default_jwt_expiry")]
    pub jwt_expiry_hours: u64,

    #[serde(default = "default_sandbox_timeout")]
    pub sandbox_timeout_secs: u64,

    #[serde(default = "default_max_containers")]
    pub max_containers_per_user: u32,
}

fn default_port() -> u16 {
    3000
}

fn default_jwt_expiry() -> u64 {
    24
}

fn default_sandbox_timeout() -> u64 {
    300
}

fn default_max_containers() -> u32 {
    3
}

impl Config {
    pub fn load() -> anyhow::Result<Self> {
        let config = config::Config::builder()
            .add_source(config::File::with_name("config/default").required(false))
            .add_source(config::File::with_name("config/local").required(false))
            .add_source(config::Environment::with_prefix("RUSTYCLINT"))
            .build()?;

        Ok(config.try_deserialize()?)
    }
}
