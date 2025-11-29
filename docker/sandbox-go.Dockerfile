# Go sandbox image
ARG BASE_IMAGE=rustyclint/sandbox-base:latest
FROM ${BASE_IMAGE}

USER root

# Install Go
RUN curl -fsSL https://go.dev/dl/go1.21.5.linux-amd64.tar.gz | tar -C /usr/local -xzf -
ENV PATH="/usr/local/go/bin:${PATH}"

# Install gopls for LSP
RUN go install golang.org/x/tools/gopls@latest
ENV PATH="/root/go/bin:${PATH}"

USER sandbox
ENV PATH="/usr/local/go/bin:/root/go/bin:${PATH}"
