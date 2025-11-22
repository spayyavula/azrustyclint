//! Tests for resource limits.

#[cfg(test)]
mod tests {
    use crate::limits::ResourceLimits;

    #[test]
    fn test_default_limits() {
        let limits = ResourceLimits::default();

        assert_eq!(limits.memory_bytes, 256 * 1024 * 1024);
        assert_eq!(limits.cpu_quota, 50000);
        assert_eq!(limits.pids_limit, 64);
        assert_eq!(limits.timeout_secs, 30);
        assert_eq!(limits.max_output_bytes, 1024 * 1024);
        assert!(!limits.network_enabled);
    }

    #[test]
    fn test_snippet_limits() {
        let limits = ResourceLimits::snippet();

        assert_eq!(limits.memory_bytes, 128 * 1024 * 1024);
        assert_eq!(limits.timeout_secs, 10);
        assert!(!limits.network_enabled);
    }

    #[test]
    fn test_project_limits() {
        let limits = ResourceLimits::project();

        assert_eq!(limits.memory_bytes, 1024 * 1024 * 1024);
        assert_eq!(limits.timeout_secs, 300);
        assert!(limits.network_enabled);
    }
}
