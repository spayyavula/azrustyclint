# Base image for sandbox containers
FROM debian:bookworm-slim

# Create non-root user
RUN groupadd -r sandbox && useradd -r -g sandbox sandbox

# Install common dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
RUN mkdir -p /code && chown sandbox:sandbox /code

WORKDIR /code
USER sandbox

# Default command (override in derived images)
CMD ["sleep", "infinity"]
