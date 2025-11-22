//! Tests for collaborative document.

#[cfg(test)]
mod tests {
    use crate::document::CollabDocument;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_new_document() {
        let doc = CollabDocument::new(Uuid::new_v4());
        let content = doc.get_content().await;
        assert_eq!(content, "");
    }

    #[tokio::test]
    async fn test_document_with_content() {
        let id = Uuid::new_v4();
        let doc = CollabDocument::with_content(id, "Hello, World!");

        assert_eq!(doc.id(), id);

        let content = doc.get_content().await;
        assert_eq!(content, "Hello, World!");
    }

    #[tokio::test]
    async fn test_encode_state() {
        let doc = CollabDocument::with_content(Uuid::new_v4(), "Test content");
        let state = doc.encode_state().await;

        // State should be non-empty binary data
        assert!(!state.is_empty());
    }

    #[tokio::test]
    async fn test_state_vector() {
        let doc = CollabDocument::with_content(Uuid::new_v4(), "Test");
        let sv = doc.state_vector().await;

        assert!(!sv.is_empty());
    }

    #[tokio::test]
    async fn test_apply_update() {
        let doc1 = CollabDocument::with_content(Uuid::new_v4(), "Hello");
        let doc2 = CollabDocument::new(Uuid::new_v4());

        // Get update from doc1
        let update = doc1.encode_state().await;

        // Apply to doc2
        doc2.apply_update(&update).await.unwrap();

        // Content should match
        assert_eq!(doc2.get_content().await, "Hello");
    }

    #[tokio::test]
    async fn test_clone_document() {
        let doc = CollabDocument::with_content(Uuid::new_v4(), "Test");
        let cloned = doc.clone();

        assert_eq!(doc.id(), cloned.id());
        assert_eq!(doc.get_content().await, cloned.get_content().await);
    }
}
