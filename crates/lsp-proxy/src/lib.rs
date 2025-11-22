//! Language Server Protocol proxy for IDE features.
//!
//! This crate manages LSP servers for different languages,
//! proxying requests from the frontend to language servers
//! running in sandbox containers.

pub mod manager;
pub mod proxy;

pub use manager::LspManager;
pub use proxy::LspProxy;

use rustyclint_common::models::Language;

/// Get the LSP server command for a language.
pub fn lsp_command(language: Language) -> Option<(&'static str, Vec<&'static str>)> {
    match language {
        Language::Rust => Some(("rust-analyzer", vec![])),
        Language::Python => Some(("pylsp", vec![])),
        Language::JavaScript | Language::TypeScript => {
            Some(("typescript-language-server", vec!["--stdio"]))
        }
        Language::Go => Some(("gopls", vec![])),
        Language::Java => Some(("jdtls", vec![])),
        Language::CSharp => Some(("OmniSharp", vec!["-lsp"])),
        Language::Cpp | Language::C => Some(("clangd", vec![])),
        Language::Ruby => Some(("solargraph", vec!["stdio"])),
        Language::Php => Some(("phpactor", vec!["language-server"])),
        Language::Kotlin => Some(("kotlin-language-server", vec![])),
        Language::Swift => Some(("sourcekit-lsp", vec![])),
    }
}
