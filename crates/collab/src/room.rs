//! Collaboration room management.

use std::sync::Arc;

use dashmap::DashMap;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::document::CollabDocument;

/// A collaboration room for a single document.
pub struct CollabRoom {
    pub document: CollabDocument,
    pub broadcast: broadcast::Sender<Vec<u8>>,
    participants: DashMap<Uuid, ParticipantInfo>,
}

/// Information about a room participant.
#[derive(Clone)]
pub struct ParticipantInfo {
    pub user_id: Uuid,
    pub username: String,
    pub cursor_position: Option<u32>,
}

impl CollabRoom {
    /// Create a new collaboration room.
    pub fn new(document: CollabDocument) -> Self {
        let (broadcast, _) = broadcast::channel(1024);
        Self {
            document,
            broadcast,
            participants: DashMap::new(),
        }
    }

    /// Add a participant to the room.
    pub fn join(&self, user_id: Uuid, username: String) -> broadcast::Receiver<Vec<u8>> {
        self.participants.insert(
            user_id,
            ParticipantInfo {
                user_id,
                username,
                cursor_position: None,
            },
        );
        self.broadcast.subscribe()
    }

    /// Remove a participant from the room.
    pub fn leave(&self, user_id: &Uuid) {
        self.participants.remove(user_id);
    }

    /// Update a participant's cursor position.
    pub fn update_cursor(&self, user_id: &Uuid, position: u32) {
        if let Some(mut info) = self.participants.get_mut(user_id) {
            info.cursor_position = Some(position);
        }
    }

    /// Broadcast an update to all participants.
    pub fn broadcast_update(&self, update: Vec<u8>) {
        let _ = self.broadcast.send(update);
    }

    /// Get list of participants.
    pub fn participants(&self) -> Vec<ParticipantInfo> {
        self.participants.iter().map(|r| r.value().clone()).collect()
    }

    /// Check if room is empty.
    pub fn is_empty(&self) -> bool {
        self.participants.is_empty()
    }
}

/// Manages all collaboration rooms.
pub struct RoomManager {
    rooms: DashMap<Uuid, Arc<CollabRoom>>,
}

impl RoomManager {
    /// Create a new room manager.
    pub fn new() -> Self {
        Self {
            rooms: DashMap::new(),
        }
    }

    /// Get or create a room for a document.
    pub fn get_or_create(&self, document_id: Uuid, content: Option<&str>) -> Arc<CollabRoom> {
        self.rooms
            .entry(document_id)
            .or_insert_with(|| {
                let doc = match content {
                    Some(c) => CollabDocument::with_content(document_id, c),
                    None => CollabDocument::new(document_id),
                };
                Arc::new(CollabRoom::new(doc))
            })
            .clone()
    }

    /// Get a room by document ID.
    pub fn get(&self, document_id: &Uuid) -> Option<Arc<CollabRoom>> {
        self.rooms.get(document_id).map(|r| r.clone())
    }

    /// Remove a room if empty.
    pub fn cleanup(&self, document_id: &Uuid) {
        if let Some(room) = self.rooms.get(document_id) {
            if room.is_empty() {
                drop(room);
                self.rooms.remove(document_id);
            }
        }
    }

    /// Get number of active rooms.
    pub fn room_count(&self) -> usize {
        self.rooms.len()
    }
}

impl Default for RoomManager {
    fn default() -> Self {
        Self::new()
    }
}
