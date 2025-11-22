//! LSP server lifecycle management.

use std::collections::HashMap;

use rustyclint_common::models::Language;
use uuid::Uuid;

use crate::proxy::LspProxy;

/// Manages LSP server instances.
pub struct LspManager {
    proxies: HashMap<(Uuid, Language), LspProxy>,
}

impl LspManager {
    /// Create a new LSP manager.
    pub fn new() -> Self {
        Self {
            proxies: HashMap::new(),
        }
    }

    /// Get or create an LSP proxy for a container/language combination.
    pub async fn get_or_create(
        &mut self,
        container_id: &str,
        session_id: Uuid,
        language: Language,
    ) -> Result<&mut LspProxy, LspError> {
        let key = (session_id, language);

        if !self.proxies.contains_key(&key) {
            let proxy = LspProxy::new(container_id, language).await?;
            self.proxies.insert(key, proxy);
        }

        Ok(self.proxies.get_mut(&key).unwrap())
    }

    /// Stop an LSP proxy.
    pub async fn stop(&mut self, session_id: Uuid, language: Language) {
        let key = (session_id, language);
        if let Some(mut proxy) = self.proxies.remove(&key) {
            let _ = proxy.shutdown().await;
        }
    }

    /// Stop all LSP proxies for a session.
    pub async fn stop_session(&mut self, session_id: Uuid) {
        let keys: Vec<_> = self
            .proxies
            .keys()
            .filter(|(sid, _)| *sid == session_id)
            .cloned()
            .collect();

        for key in keys {
            if let Some(mut proxy) = self.proxies.remove(&key) {
                let _ = proxy.shutdown().await;
            }
        }
    }
}

impl Default for LspManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Errors from LSP operations.
#[derive(Debug, thiserror::Error)]
pub enum LspError {
    #[error("Language {0:?} does not have LSP support")]
    UnsupportedLanguage(Language),

    #[error("Failed to start LSP server: {0}")]
    StartFailed(String),

    #[error("LSP communication error: {0}")]
    Communication(String),
}
