//! Code execution within sandbox containers.

use std::time::{Duration, Instant};

use bollard::exec::{CreateExecOptions, StartExecResults};
use rustyclint_common::models::Language;
use serde::{Deserialize, Serialize};

use crate::{container::ContainerManager, limits::ResourceLimits};

/// Request to execute code in a sandbox.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionRequest {
    pub code: String,
    pub language: Language,
    pub stdin: Option<String>,
    pub args: Vec<String>,
}

/// Result of code execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i64,
    pub execution_time_ms: u64,
    pub timed_out: bool,
}

/// Executes code in sandbox containers.
pub struct SandboxExecutor {
    manager: ContainerManager,
    limits: ResourceLimits,
}

impl SandboxExecutor {
    /// Create a new executor with default limits.
    pub fn new() -> Result<Self, bollard::errors::Error> {
        Ok(Self {
            manager: ContainerManager::new()?,
            limits: ResourceLimits::default(),
        })
    }

    /// Create an executor with custom limits.
    pub fn with_limits(limits: ResourceLimits) -> Result<Self, bollard::errors::Error> {
        Ok(Self {
            manager: ContainerManager::new()?,
            limits,
        })
    }

    /// Execute code and return results.
    pub async fn execute(
        &self,
        request: ExecutionRequest,
    ) -> Result<ExecutionResult, bollard::errors::Error> {
        let start = Instant::now();

        // Create container
        let container_id = self
            .manager
            .create_container(request.language, &self.limits)
            .await?;

        // Write code to container
        let filename = format!("main.{}", request.language.extension());
        let write_cmd = vec![
            "sh".to_string(),
            "-c".to_string(),
            format!("cat > /code/{}", filename),
        ];

        let exec = self
            .manager
            .docker()
            .create_exec(
                &container_id,
                CreateExecOptions {
                    cmd: Some(write_cmd),
                    attach_stdin: Some(true),
                    attach_stdout: Some(true),
                    attach_stderr: Some(true),
                    working_dir: Some("/code".to_string()),
                    ..Default::default()
                },
            )
            .await?;

        if let StartExecResults::Attached { mut input, .. } = self
            .manager
            .docker()
            .start_exec(&exec.id, None)
            .await?
        {
            use tokio::io::AsyncWriteExt;
            input.write_all(request.code.as_bytes()).await?;
            input.shutdown().await?;
        }

        // Build execution command based on language
        let run_cmd = self.build_run_command(&request.language, &filename, &request.args);

        let exec = self
            .manager
            .docker()
            .create_exec(
                &container_id,
                CreateExecOptions {
                    cmd: Some(run_cmd),
                    attach_stdout: Some(true),
                    attach_stderr: Some(true),
                    working_dir: Some("/code".to_string()),
                    ..Default::default()
                },
            )
            .await?;

        // Execute with timeout
        let timeout = Duration::from_secs(self.limits.timeout_secs);
        let (stdout, stderr, timed_out) = match tokio::time::timeout(
            timeout,
            self.collect_output(&exec.id),
        )
        .await
        {
            Ok(result) => {
                let (stdout, stderr) = result?;
                (stdout, stderr, false)
            }
            Err(_) => {
                // Timeout occurred
                (String::new(), "Execution timed out".to_string(), true)
            }
        };

        // Get exit code
        let inspect = self.manager.docker().inspect_exec(&exec.id).await?;
        let exit_code = inspect.exit_code.unwrap_or(-1);

        // Clean up container
        let _ = self.manager.remove_container(&container_id).await;

        let execution_time_ms = start.elapsed().as_millis() as u64;

        Ok(ExecutionResult {
            stdout,
            stderr,
            exit_code,
            execution_time_ms,
            timed_out,
        })
    }

    fn build_run_command(
        &self,
        language: &Language,
        filename: &str,
        args: &[String],
    ) -> Vec<String> {
        let mut cmd = match language {
            Language::Python => vec!["python3".to_string(), filename.to_string()],
            Language::JavaScript => vec!["node".to_string(), filename.to_string()],
            Language::TypeScript => vec!["npx".to_string(), "ts-node".to_string(), filename.to_string()],
            Language::Rust => vec![
                "sh".to_string(),
                "-c".to_string(),
                format!("rustc {} -o /tmp/out && /tmp/out", filename),
            ],
            Language::Go => vec!["go".to_string(), "run".to_string(), filename.to_string()],
            Language::Java => vec![
                "sh".to_string(),
                "-c".to_string(),
                format!("javac {} && java Main", filename),
            ],
            Language::CSharp => vec!["dotnet".to_string(), "script".to_string(), filename.to_string()],
            Language::Cpp => vec![
                "sh".to_string(),
                "-c".to_string(),
                format!("g++ {} -o /tmp/out && /tmp/out", filename),
            ],
            Language::C => vec![
                "sh".to_string(),
                "-c".to_string(),
                format!("gcc {} -o /tmp/out && /tmp/out", filename),
            ],
            Language::Ruby => vec!["ruby".to_string(), filename.to_string()],
            Language::Php => vec!["php".to_string(), filename.to_string()],
            Language::Swift => vec!["swift".to_string(), filename.to_string()],
            Language::Kotlin => vec![
                "sh".to_string(),
                "-c".to_string(),
                format!("kotlinc {} -include-runtime -d /tmp/out.jar && java -jar /tmp/out.jar", filename),
            ],
        };

        cmd.extend(args.iter().cloned());
        cmd
    }

    async fn collect_output(
        &self,
        exec_id: &str,
    ) -> Result<(String, String), bollard::errors::Error> {
        use futures_util::StreamExt;

        let mut stdout = Vec::new();
        let mut stderr = Vec::new();

        if let StartExecResults::Attached { mut output, .. } = self
            .manager
            .docker()
            .start_exec(exec_id, None)
            .await?
        {
            while let Some(Ok(chunk)) = output.next().await {
                match chunk {
                    bollard::container::LogOutput::StdOut { message } => {
                        stdout.extend_from_slice(&message);
                    }
                    bollard::container::LogOutput::StdErr { message } => {
                        stderr.extend_from_slice(&message);
                    }
                    _ => {}
                }
            }
        }

        Ok((
            String::from_utf8_lossy(&stdout).to_string(),
            String::from_utf8_lossy(&stderr).to_string(),
        ))
    }
}

impl Default for SandboxExecutor {
    fn default() -> Self {
        Self::new().expect("Failed to create sandbox executor")
    }
}
