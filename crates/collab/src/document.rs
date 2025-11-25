//! CRDT document management.

use std::sync::Arc;

use tokio::sync::RwLock;
use uuid::Uuid;
use yrs::updates::decoder::Decode;
use yrs::updates::encoder::Encode;
use yrs::{Doc, GetString, ReadTxn, Text, Transact, Update};

/// A collaborative document backed by a Yjs CRDT.
pub struct CollabDocument {
    id: Uuid,
    doc: Arc<RwLock<Doc>>,
}

impl CollabDocument {
    /// Create a new empty document.
    pub fn new(id: Uuid) -> Self {
        Self {
            id,
            doc: Arc::new(RwLock::new(Doc::new())),
        }
    }

    /// Create a document with initial content.
    pub fn with_content(id: Uuid, content: &str) -> Self {
        let doc = Doc::new();
        {
            let text = doc.get_or_insert_text("content");
            let mut txn = doc.transact_mut();
            text.insert(&mut txn, 0, content);
        }
        Self {
            id,
            doc: Arc::new(RwLock::new(doc)),
        }
    }

    /// Get the document ID.
    pub fn id(&self) -> Uuid {
        self.id
    }

    /// Apply a binary update from a client.
    pub async fn apply_update(&self, update: &[u8]) -> Result<(), yrs::encoding::read::Error> {
        let doc = self.doc.write().await;
        let update = Update::decode_v1(update)?;
        let mut txn = doc.transact_mut();
        txn.apply_update(update);
        Ok(())
    }

    /// Get the current document state as a binary update.
    pub async fn encode_state(&self) -> Vec<u8> {
        let doc = self.doc.read().await;
        let txn = doc.transact();
        txn.encode_state_as_update_v1(&yrs::StateVector::default())
    }

    /// Get the state vector for sync.
    pub async fn state_vector(&self) -> Vec<u8> {
        let doc = self.doc.read().await;
        let txn = doc.transact();
        txn.state_vector().encode_v1()
    }

    /// Encode state as update based on a client's state vector (for sync step 2).
    pub async fn encode_diff(&self, state_vector: &[u8]) -> Result<Vec<u8>, yrs::encoding::read::Error> {
        let doc = self.doc.read().await;
        let txn = doc.transact();
        let sv = yrs::StateVector::decode_v1(state_vector)?;
        Ok(txn.encode_state_as_update_v1(&sv))
    }

    /// Get the document content as plain text.
    pub async fn get_content(&self) -> String {
        let doc = self.doc.read().await;
        let text = doc.get_or_insert_text("content");
        let txn = doc.transact();
        text.get_string(&txn)
    }

    /// Subscribe to document updates.
    pub async fn on_update<F>(&self, callback: F)
    where
        F: Fn(&[u8]) + Send + Sync + 'static,
    {
        let doc = self.doc.write().await;
        let _sub = doc
            .observe_update_v1(move |_, event| {
                callback(&event.update);
            })
            .unwrap();
        // Note: In production, store subscription to prevent it from being dropped
    }
}

impl Clone for CollabDocument {
    fn clone(&self) -> Self {
        Self {
            id: self.id,
            doc: Arc::clone(&self.doc),
        }
    }
}
