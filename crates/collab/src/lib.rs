//! Real-time collaboration service using CRDTs.
//!
//! This crate provides collaborative editing using Yjs/Yrs CRDTs,
//! enabling multiple users to edit documents simultaneously without conflicts.

pub mod awareness;
pub mod document;
pub mod room;
pub mod sync;

pub use document::CollabDocument;
pub use room::{CollabRoom, RoomManager};
pub use sync::SyncProtocol;
