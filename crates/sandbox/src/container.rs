//! Docker container management.

use std::collections::HashMap;

use bollard::{
    container::{
        Config, CreateContainerOptions, RemoveContainerOptions, StartContainerOptions,
        StopContainerOptions,
    },
    image::CreateImageOptions,
    secret::{HostConfig, ResourcesUlimits},
    Docker,
};
use rustyclint_common::models::Language;
use uuid::Uuid;

use crate::limits::ResourceLimits;

/// Manages Docker containers for sandbox execution.
pub struct ContainerManager {
    docker: Docker,
}

impl ContainerManager {
    /// Create a new container manager.
    pub fn new() -> Result<Self, bollard::errors::Error> {
        let docker = Docker::connect_with_local_defaults()?;
        Ok(Self { docker })
    }

    /// Pull the sandbox image for a language if not present.
    pub async fn ensure_image(&self, language: Language) -> Result<(), bollard::errors::Error> {
        let image = language.docker_image();

        let options = CreateImageOptions {
            from_image: image,
            ..Default::default()
        };

        use futures_util::StreamExt;
        let mut stream = self.docker.create_image(Some(options), None, None);
        while let Some(result) = stream.next().await {
            result?;
        }

        Ok(())
    }

    /// Create and start a new sandbox container.
    pub async fn create_container(
        &self,
        language: Language,
        limits: &ResourceLimits,
    ) -> Result<String, bollard::errors::Error> {
        let container_name = format!("rustyclint-{}-{}", language.extension(), Uuid::new_v4());

        let host_config = HostConfig {
            memory: Some(limits.memory_bytes as i64),
            memory_swap: Some(limits.memory_bytes as i64), // No swap
            cpu_quota: Some(limits.cpu_quota),
            cpu_period: Some(100000),
            pids_limit: Some(limits.pids_limit),
            network_mode: Some(if limits.network_enabled {
                "bridge".to_string()
            } else {
                "none".to_string()
            }),
            readonly_rootfs: Some(true),
            cap_drop: Some(vec!["ALL".to_string()]),
            security_opt: Some(vec!["no-new-privileges:true".to_string()]),
            ulimits: Some(vec![
                ResourcesUlimits {
                    name: Some("nofile".to_string()),
                    soft: Some(1024),
                    hard: Some(1024),
                },
                ResourcesUlimits {
                    name: Some("nproc".to_string()),
                    soft: Some(limits.pids_limit),
                    hard: Some(limits.pids_limit),
                },
            ]),
            tmpfs: Some(HashMap::from([
                ("/tmp".to_string(), "rw,noexec,nosuid,size=64m".to_string()),
                ("/code".to_string(), "rw,noexec,nosuid,size=32m".to_string()),
            ])),
            ..Default::default()
        };

        let config = Config {
            image: Some(language.docker_image().to_string()),
            host_config: Some(host_config),
            working_dir: Some("/code".to_string()),
            user: Some("sandbox".to_string()),
            tty: Some(true),
            open_stdin: Some(true),
            ..Default::default()
        };

        let options = CreateContainerOptions {
            name: &container_name,
            platform: None,
        };

        let response = self.docker.create_container(Some(options), config).await?;

        self.docker
            .start_container(&response.id, None::<StartContainerOptions<String>>)
            .await?;

        Ok(response.id)
    }

    /// Stop and remove a container.
    pub async fn remove_container(&self, container_id: &str) -> Result<(), bollard::errors::Error> {
        // Stop container with short timeout
        let _ = self
            .docker
            .stop_container(
                container_id,
                Some(StopContainerOptions { t: 5 }),
            )
            .await;

        // Remove container
        self.docker
            .remove_container(
                container_id,
                Some(RemoveContainerOptions {
                    force: true,
                    ..Default::default()
                }),
            )
            .await?;

        Ok(())
    }

    /// Get the underlying Docker client.
    pub fn docker(&self) -> &Docker {
        &self.docker
    }
}

impl Default for ContainerManager {
    fn default() -> Self {
        Self::new().expect("Failed to connect to Docker")
    }
}
