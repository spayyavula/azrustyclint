# C/C++ sandbox image
ARG BASE_IMAGE=rustyclint/sandbox-base:latest
FROM ${BASE_IMAGE}

USER root

# Install GCC, G++, and clangd for LSP
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    clangd \
    make \
    && rm -rf /var/lib/apt/lists/*

USER sandbox
