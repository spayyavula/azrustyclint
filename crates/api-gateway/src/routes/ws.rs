//! WebSocket handlers for real-time features.

use std::sync::Arc;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    response::Response,
};
use rustyclint_collab::{RoomManager, SyncProtocol};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::state::AppState;

// Global room manager (in production, this would be in AppState)
static ROOM_MANAGER: std::sync::OnceLock<Arc<RwLock<RoomManager>>> = std::sync::OnceLock::new();

fn get_room_manager() -> &'static Arc<RwLock<RoomManager>> {
    ROOM_MANAGER.get_or_init(|| Arc::new(RwLock::new(RoomManager::new())))
}

/// Client message types for collaboration.
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
enum CollabMessage {
    /// Authentication with JWT token.
    Auth { token: String },
    /// Sync request with state vector.
    Sync { state_vector: Vec<u8> },
    /// Document update.
    Update { data: Vec<u8> },
    /// Cursor/selection awareness update.
    Awareness { user_id: String, cursor: Option<CursorPosition> },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CursorPosition {
    line: u32,
    column: u32,
}

/// Server message types.
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
enum ServerMessage {
    /// Authentication result.
    AuthResult { success: bool, error: Option<String> },
    /// Initial document state.
    InitialState { data: Vec<u8> },
    /// Document update from another client.
    Update { data: Vec<u8> },
    /// Awareness update from another client.
    Awareness { user_id: String, cursor: Option<CursorPosition> },
    /// User joined the room.
    UserJoined { user_id: String, username: String },
    /// User left the room.
    UserLeft { user_id: String },
    /// Error message.
    Error { message: String },
}

/// WebSocket handler for collaborative editing.
pub async fn collab_handler(
    ws: WebSocketUpgrade,
    State(_state): State<AppState>,
    Path(file_id): Path<Uuid>,
) -> Response {
    ws.on_upgrade(move |socket| handle_collab(socket, file_id))
}

async fn handle_collab(socket: WebSocket, file_id: Uuid) {
    let (mut sender, mut receiver) = socket.split();
    use futures_util::{SinkExt, StreamExt};

    // Get or create room
    let room_manager = get_room_manager();
    let room = {
        let manager = room_manager.write().await;
        manager.get_or_create(file_id, None)
    };

    // Generate temporary user ID (in production, authenticate first)
    let user_id = Uuid::new_v4();
    let username = format!("User-{}", &user_id.to_string()[..8]);

    // Join room and get broadcast receiver
    let mut broadcast_rx = room.join(user_id, username.clone());

    // Send initial sync step 1 (server's state vector)
    let state_vector = room.document.state_vector().await;
    let mut sync_step1 = vec![0u8]; // message type 0
    sync_step1.extend_from_slice(&state_vector);
    let _ = sender.send(Message::Binary(sync_step1)).await;

    // Notify others of join
    let join_msg = serde_json::to_vec(&ServerMessage::UserJoined {
        user_id: user_id.to_string(),
        username: username.clone(),
    })
    .unwrap_or_default();
    room.broadcast_update(join_msg);

    // Handle messages
    loop {
        tokio::select! {
            // Receive from client
            Some(msg) = receiver.next() => {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(collab_msg) = serde_json::from_str::<CollabMessage>(&text) {
                            match collab_msg {
                                CollabMessage::Update { data } => {
                                    // Apply update to document
                                    if let Err(e) = room.document.apply_update(&data).await {
                                        let error_msg = ServerMessage::Error {
                                            message: format!("Failed to apply update: {}", e),
                                        };
                                        if let Ok(json) = serde_json::to_string(&error_msg) {
                                            let _ = sender.send(Message::Text(json)).await;
                                        }
                                        continue;
                                    }

                                    // Broadcast to others
                                    let update_msg = serde_json::to_vec(&ServerMessage::Update { data })
                                        .unwrap_or_default();
                                    room.broadcast_update(update_msg);
                                }

                                CollabMessage::Sync { state_vector } => {
                                    // Send diff based on client's state vector
                                    let sync_msg = SyncProtocol::create_sync_step1(state_vector);
                                    let encoded = SyncProtocol::encode(&sync_msg);
                                    let _ = sender.send(Message::Binary(encoded)).await;
                                }

                                CollabMessage::Awareness { user_id: _, cursor } => {
                                    // Update cursor position and broadcast
                                    if let Some(ref pos) = cursor {
                                        room.update_cursor(&user_id, pos.line);
                                    }

                                    let awareness_msg = serde_json::to_vec(&ServerMessage::Awareness {
                                        user_id: user_id.to_string(),
                                        cursor,
                                    })
                                    .unwrap_or_default();
                                    room.broadcast_update(awareness_msg);
                                }

                                CollabMessage::Auth { token: _ } => {
                                    // In production, verify JWT and get real user info
                                    let auth_result = ServerMessage::AuthResult {
                                        success: true,
                                        error: None,
                                    };
                                    if let Ok(json) = serde_json::to_string(&auth_result) {
                                        let _ = sender.send(Message::Text(json)).await;
                                    }
                                }
                            }
                        }
                    }

                    Ok(Message::Binary(data)) => {
                        // Handle y-websocket protocol messages
                        if data.is_empty() {
                            continue;
                        }

                        let msg_type = data[0];
                        let payload = &data[1..];

                        match msg_type {
                            0 => {
                                // Sync step 1: client sends state vector, respond with diff
                                match room.document.encode_diff(payload).await {
                                    Ok(diff) => {
                                        // Send sync step 2 response
                                        let mut response = vec![1u8]; // message type 1
                                        response.extend_from_slice(&diff);
                                        let _ = sender.send(Message::Binary(response)).await;
                                    }
                                    Err(e) => {
                                        tracing::error!("Failed to encode diff: {}", e);
                                    }
                                }
                            }
                            1 => {
                                // Sync step 2: apply the update
                                if let Err(e) = room.document.apply_update(payload).await {
                                    tracing::error!("Failed to apply sync step 2: {}", e);
                                }
                            }
                            2 => {
                                // Update: apply and broadcast
                                if let Err(e) = room.document.apply_update(payload).await {
                                    tracing::error!("Failed to apply update: {}", e);
                                    continue;
                                }

                                // Broadcast to others (with message type prefix)
                                let mut broadcast_data = vec![2u8];
                                broadcast_data.extend_from_slice(payload);
                                room.broadcast_update(broadcast_data);
                            }
                            _ => {
                                // Unknown message type (could be awareness, etc.)
                                tracing::debug!("Unknown y-websocket message type: {}", msg_type);
                            }
                        }
                    }

                    Ok(Message::Close(_)) => break,
                    Err(_) => break,
                    _ => {}
                }
            }

            // Receive broadcasts from other clients
            Ok(data) = broadcast_rx.recv() => {
                // Forward to this client
                let _ = sender.send(Message::Binary(data)).await;
            }
        }
    }

    // Leave room
    room.leave(&user_id);

    // Notify others of leave
    let leave_msg = serde_json::to_vec(&ServerMessage::UserLeft {
        user_id: user_id.to_string(),
    })
    .unwrap_or_default();
    room.broadcast_update(leave_msg);

    // Cleanup empty room
    let manager = room_manager.write().await;
    manager.cleanup(&file_id);
}

/// WebSocket handler for terminal sessions.
pub async fn terminal_handler(
    ws: WebSocketUpgrade,
    State(_state): State<AppState>,
    Path(session_id): Path<Uuid>,
) -> Response {
    ws.on_upgrade(move |socket| handle_terminal(socket, session_id))
}

async fn handle_terminal(mut socket: WebSocket, _session_id: Uuid) {
    // TODO: Connect to container's PTY
    // 1. Authenticate user from first message
    // 2. Verify session ownership
    // 3. Attach to container stdin/stdout using bollard
    // 4. Relay input/output

    // For now, echo messages back
    while let Some(Ok(msg)) = socket.recv().await {
        match msg {
            Message::Text(text) => {
                let response = format!("Terminal echo: {}", text);
                let _ = socket.send(Message::Text(response)).await;
            }
            Message::Close(_) => break,
            _ => {}
        }
    }
}

/// WebSocket handler for WebRTC signaling (voice/video chat).
pub async fn signaling_handler(
    ws: WebSocketUpgrade,
    State(_state): State<AppState>,
    Path(room_id): Path<Uuid>,
) -> Response {
    ws.on_upgrade(move |socket| handle_signaling(socket, room_id))
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
enum SignalingMessage {
    /// SDP offer.
    Offer { sdp: String, target: String },
    /// SDP answer.
    Answer { sdp: String, target: String },
    /// ICE candidate.
    IceCandidate { candidate: String, target: String },
    /// Join room.
    Join { user_id: String },
    /// Leave room.
    Leave { user_id: String },
}

async fn handle_signaling(mut socket: WebSocket, _room_id: Uuid) {
    // TODO: Implement WebRTC signaling
    // 1. Authenticate user
    // 2. Join signaling room
    // 3. Relay SDP offers/answers and ICE candidates between peers

    // For now, echo signaling messages
    while let Some(Ok(msg)) = socket.recv().await {
        match msg {
            Message::Text(text) => {
                // Parse and relay signaling message
                if let Ok(sig_msg) = serde_json::from_str::<SignalingMessage>(&text) {
                    tracing::debug!("Signaling message: {:?}", sig_msg);
                    // In production, relay to target peer
                    let _ = socket.send(Message::Text(text)).await;
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }
}
