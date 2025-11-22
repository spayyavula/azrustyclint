# Python sandbox image
FROM rustyclint/sandbox-base:latest

USER root

# Install Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install LSP server
RUN pip3 install --break-system-packages python-lsp-server

USER sandbox
