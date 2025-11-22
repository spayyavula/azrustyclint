//! Resource limits for sandbox containers.

use serde::{Deserialize, Serialize};

/// Resource limits applied to sandbox containers.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceLimits {
    /// Maximum memory in bytes (default: 256MB).
    pub memory_bytes: u64,

    /// Maximum CPU quota (default: 50000 = 50% of one CPU).
    pub cpu_quota: i64,

    /// Maximum number of processes/threads.
    pub pids_limit: i64,

    /// Execution timeout in seconds.
    pub timeout_secs: u64,

    /// Maximum output size in bytes.
    pub max_output_bytes: usize,

    /// Whether to enable network access (default: false).
    pub network_enabled: bool,
}

impl Default for ResourceLimits {
    fn default() -> Self {
        Self {
            memory_bytes: 256 * 1024 * 1024, // 256 MB
            cpu_quota: 50000,                 // 50% of one CPU
            pids_limit: 64,
            timeout_secs: 30,
            max_output_bytes: 1024 * 1024, // 1 MB
            network_enabled: false,
        }
    }
}

impl ResourceLimits {
    /// Create limits for quick code snippets.
    pub fn snippet() -> Self {
        Self {
            memory_bytes: 128 * 1024 * 1024,
            cpu_quota: 25000,
            pids_limit: 32,
            timeout_secs: 10,
            max_output_bytes: 64 * 1024,
            network_enabled: false,
        }
    }

    /// Create limits for full project builds.
    pub fn project() -> Self {
        Self {
            memory_bytes: 1024 * 1024 * 1024, // 1 GB
            cpu_quota: 100000,                 // 100% of one CPU
            pids_limit: 256,
            timeout_secs: 300,
            max_output_bytes: 10 * 1024 * 1024, // 10 MB
            network_enabled: true,              // Allow package downloads
        }
    }
}
