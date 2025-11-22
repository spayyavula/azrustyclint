//! Sandbox orchestration for secure code execution.
//!
//! This crate manages Docker containers for isolated code execution,
//! providing security through resource limits, network isolation, and timeouts.

pub mod container;
pub mod executor;
pub mod limits;

pub use container::ContainerManager;
pub use executor::{ExecutionRequest, ExecutionResult, SandboxExecutor};
pub use limits::ResourceLimits;
