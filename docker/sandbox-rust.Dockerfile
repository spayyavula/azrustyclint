# Rust sandbox image
ARG BASE_IMAGE=rustyclint/sandbox-base:latest
FROM ${BASE_IMAGE}

USER root

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal
ENV PATH="/root/.cargo/bin:${PATH}"

# Install rust-analyzer for LSP
RUN rustup component add rust-analyzer

# Switch back to sandbox user
USER sandbox
ENV PATH="/root/.cargo/bin:${PATH}"
