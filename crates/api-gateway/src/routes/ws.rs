//! WebSocket handlers for real-time features.

use std::sync::Arc;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    response::Response,
};
use rustyclint_collab::RoomManager;
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
    // y-websocket protocol: [messageType, syncType, ...payload]
    // messageType 0 = sync, syncType 0 = step1 (state vector)
    let state_vector = room.document.state_vector().await;
    let mut sync_step1 = vec![0u8, 0u8]; // message type 0 (sync), sync step 0 (step1)
    sync_step1.extend_from_slice(&state_vector);
    let _ = sender.send(Message::Binary(sync_step1)).await;

    // Note: UserJoined/UserLeft notifications are not part of y-websocket protocol
    // They would need a separate signaling channel if needed
    tracing::info!("User {} ({}) joined room {}", username, user_id, file_id);

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

                                    // Broadcast to others using y-websocket protocol format
                                    let mut broadcast_data = vec![0u8, 2u8]; // sync message, update
                                    broadcast_data.extend_from_slice(&data);
                                    room.broadcast_update(broadcast_data);
                                }

                                CollabMessage::Sync { state_vector } => {
                                    // Send diff based on client's state vector using y-websocket protocol
                                    match room.document.encode_diff(&state_vector).await {
                                        Ok(diff) => {
                                            let mut response = vec![0u8, 1u8]; // sync message, step 2
                                            response.extend_from_slice(&diff);
                                            let _ = sender.send(Message::Binary(response)).await;
                                        }
                                        Err(e) => {
                                            tracing::error!("Failed to encode diff: {}", e);
                                        }
                                    }
                                }

                                CollabMessage::Awareness { user_id: _, cursor } => {
                                    // Update cursor position
                                    if let Some(ref pos) = cursor {
                                        room.update_cursor(&user_id, pos.line);
                                    }
                                    // Note: For proper y-websocket awareness, client should send
                                    // binary awareness messages (type 1), not JSON
                                    tracing::debug!("Received JSON awareness update from {}", user_id);
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
                        // Protocol: [messageType, subType (for sync), ...payload]
                        // messageType 0 = sync, messageType 1 = awareness
                        if data.len() < 2 {
                            continue;
                        }

                        let msg_type = data[0];

                        match msg_type {
                            0 => {
                                // Sync message - has sub-type
                                let sync_type = data[1];
                                let payload = &data[2..];

                                match sync_type {
                                    0 => {
                                        // Sync step 1: client sends state vector, respond with step 2 (diff)
                                        match room.document.encode_diff(payload).await {
                                            Ok(diff) => {
                                                // Send sync step 2 response: [0, 1, ...diff]
                                                let mut response = vec![0u8, 1u8]; // sync message, step 2
                                                response.extend_from_slice(&diff);
                                                let _ = sender.send(Message::Binary(response)).await;
                                            }
                                            Err(e) => {
                                                tracing::error!("Failed to encode diff: {}", e);
                                            }
                                        }
                                    }
                                    1 => {
                                        // Sync step 2: apply the update (diff from server)
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

                                        // Broadcast to others (preserve full message format)
                                        let mut broadcast_data = vec![0u8, 2u8]; // sync message, update
                                        broadcast_data.extend_from_slice(payload);
                                        room.broadcast_update(broadcast_data);
                                    }
                                    _ => {
                                        tracing::debug!("Unknown sync sub-type: {}", sync_type);
                                    }
                                }
                            }
                            1 => {
                                // Awareness message - broadcast to others as-is
                                room.broadcast_update(data.to_vec());
                            }
                            _ => {
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

    // Note: UserLeft notifications are not part of y-websocket protocol
    tracing::info!("User {} left room {}", user_id, file_id);

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
