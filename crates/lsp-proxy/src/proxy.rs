//! LSP proxy for communication with language servers.

use rustyclint_common::models::Language;
use serde_json::Value;

use crate::manager::LspError;

/// Proxy for communicating with an LSP server in a container.
pub struct LspProxy {
    language: Language,
    container_id: String,
    request_id: i64,
}

impl LspProxy {
    /// Create a new LSP proxy and start the language server.
    pub async fn new(container_id: &str, language: Language) -> Result<Self, LspError> {
        let (cmd, _args) = crate::lsp_command(language)
            .ok_or(LspError::UnsupportedLanguage(language))?;

        tracing::info!(
            "Starting LSP server {} for {:?} in container {}",
            cmd,
            language,
            container_id
        );

        // TODO: Start LSP server process in container
        // This would use Docker exec to run the LSP server
        // and establish stdin/stdout communication

        Ok(Self {
            language,
            container_id: container_id.to_string(),
            request_id: 0,
        })
    }

    /// Send a request to the LSP server.
    pub async fn request(&mut self, method: &str, params: Value) -> Result<Value, LspError> {
        self.request_id += 1;

        let request = serde_json::json!({
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method,
            "params": params
        });

        tracing::debug!("LSP request: {}", request);

        // TODO: Send request to LSP server via Docker exec
        // and read response

        Ok(Value::Null)
    }

    /// Send a notification to the LSP server.
    pub async fn notify(&mut self, method: &str, params: Value) -> Result<(), LspError> {
        let notification = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        });

        tracing::debug!("LSP notification: {}", notification);

        // TODO: Send notification to LSP server

        Ok(())
    }

    /// Initialize the LSP server for a workspace.
    pub async fn initialize(&mut self, root_uri: &str) -> Result<Value, LspError> {
        self.request(
            "initialize",
            serde_json::json!({
                "rootUri": root_uri,
                "capabilities": {
                    "textDocument": {
                        "completion": {
                            "completionItem": {
                                "snippetSupport": true
                            }
                        },
                        "hover": {},
                        "definition": {},
                        "references": {},
                        "documentSymbol": {},
                        "codeAction": {},
                        "formatting": {},
                        "rename": {}
                    }
                }
            }),
        )
        .await
    }

    /// Request completions at a position.
    pub async fn completion(
        &mut self,
        uri: &str,
        line: u32,
        character: u32,
    ) -> Result<Value, LspError> {
        self.request(
            "textDocument/completion",
            serde_json::json!({
                "textDocument": { "uri": uri },
                "position": { "line": line, "character": character }
            }),
        )
        .await
    }

    /// Request hover information at a position.
    pub async fn hover(
        &mut self,
        uri: &str,
        line: u32,
        character: u32,
    ) -> Result<Value, LspError> {
        self.request(
            "textDocument/hover",
            serde_json::json!({
                "textDocument": { "uri": uri },
                "position": { "line": line, "character": character }
            }),
        )
        .await
    }

    /// Go to definition.
    pub async fn definition(
        &mut self,
        uri: &str,
        line: u32,
        character: u32,
    ) -> Result<Value, LspError> {
        self.request(
            "textDocument/definition",
            serde_json::json!({
                "textDocument": { "uri": uri },
                "position": { "line": line, "character": character }
            }),
        )
        .await
    }

    /// Notify that a document was opened.
    pub async fn did_open(&mut self, uri: &str, language_id: &str, text: &str) -> Result<(), LspError> {
        self.notify(
            "textDocument/didOpen",
            serde_json::json!({
                "textDocument": {
                    "uri": uri,
                    "languageId": language_id,
                    "version": 1,
                    "text": text
                }
            }),
        )
        .await
    }

    /// Notify that a document changed.
    pub async fn did_change(
        &mut self,
        uri: &str,
        version: i32,
        text: &str,
    ) -> Result<(), LspError> {
        self.notify(
            "textDocument/didChange",
            serde_json::json!({
                "textDocument": { "uri": uri, "version": version },
                "contentChanges": [{ "text": text }]
            }),
        )
        .await
    }

    /// Shutdown the LSP server.
    pub async fn shutdown(&mut self) -> Result<(), LspError> {
        let _ = self.request("shutdown", Value::Null).await;
        self.notify("exit", Value::Null).await
    }

    /// Get the language this proxy is for.
    pub fn language(&self) -> Language {
        self.language
    }

    /// Get the container ID.
    pub fn container_id(&self) -> &str {
        &self.container_id
    }
}
