//! Yjs sync protocol implementation.

use serde::{Deserialize, Serialize};

/// Messages for the Yjs sync protocol.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum SyncMessage {
    /// Request sync with state vector.
    SyncStep1 { state_vector: Vec<u8> },

    /// Response with document updates.
    SyncStep2 { update: Vec<u8> },

    /// Incremental update.
    Update { update: Vec<u8> },

    /// Awareness update (cursor positions, selections).
    Awareness { update: Vec<u8> },
}

/// Protocol handler for Yjs synchronization.
pub struct SyncProtocol;

impl SyncProtocol {
    /// Create a sync step 1 message (request).
    pub fn create_sync_step1(state_vector: Vec<u8>) -> SyncMessage {
        SyncMessage::SyncStep1 { state_vector }
    }

    /// Create a sync step 2 message (response).
    pub fn create_sync_step2(update: Vec<u8>) -> SyncMessage {
        SyncMessage::SyncStep2 { update }
    }

    /// Create an update message.
    pub fn create_update(update: Vec<u8>) -> SyncMessage {
        SyncMessage::Update { update }
    }

    /// Create an awareness message.
    pub fn create_awareness(update: Vec<u8>) -> SyncMessage {
        SyncMessage::Awareness { update }
    }

    /// Encode a message to binary.
    pub fn encode(message: &SyncMessage) -> Vec<u8> {
        serde_json::to_vec(message).unwrap_or_default()
    }

    /// Decode a message from binary.
    pub fn decode(data: &[u8]) -> Result<SyncMessage, serde_json::Error> {
        serde_json::from_slice(data)
    }
}
