//! Awareness protocol for cursor positions and presence.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Awareness state for a single client.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwarenessState {
    pub user_id: Uuid,
    pub username: String,
    pub color: String,
    pub cursor: Option<CursorState>,
    pub selection: Option<SelectionState>,
}

/// Cursor position in the document.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorState {
    pub line: u32,
    pub column: u32,
}

/// Text selection in the document.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionState {
    pub start_line: u32,
    pub start_column: u32,
    pub end_line: u32,
    pub end_column: u32,
}

/// Manages awareness states for all clients in a room.
#[derive(Default)]
pub struct AwarenessManager {
    states: HashMap<Uuid, AwarenessState>,
}

impl AwarenessManager {
    /// Create a new awareness manager.
    pub fn new() -> Self {
        Self {
            states: HashMap::new(),
        }
    }

    /// Update a client's awareness state.
    pub fn update(&mut self, client_id: Uuid, state: AwarenessState) {
        self.states.insert(client_id, state);
    }

    /// Remove a client's awareness state.
    pub fn remove(&mut self, client_id: &Uuid) {
        self.states.remove(client_id);
    }

    /// Get all awareness states.
    pub fn get_all(&self) -> Vec<&AwarenessState> {
        self.states.values().collect()
    }

    /// Encode all states for broadcast.
    pub fn encode(&self) -> Vec<u8> {
        serde_json::to_vec(&self.states).unwrap_or_default()
    }

    /// Generate a random color for a user.
    pub fn generate_color(user_id: &Uuid) -> String {
        // Simple hash-based color generation
        let bytes = user_id.as_bytes();
        let r = bytes[0] % 200 + 55;
        let g = bytes[1] % 200 + 55;
        let b = bytes[2] % 200 + 55;
        format!("#{:02x}{:02x}{:02x}", r, g, b)
    }
}
