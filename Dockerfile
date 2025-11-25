# Build stage
FROM rust:1.83-bookworm AS builder

WORKDIR /app
COPY . .

# Pin packages to avoid edition2024 requirement
RUN cargo update -p base64ct --precise 1.6.0 && \
    cargo update -p home --precise 0.5.9

# Accept DATABASE_URL as build argument and set as environment variable for sqlx
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Build with DATABASE_URL available for sqlx compile-time verification
RUN cargo build --release --bin rustyclint

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/rustyclint /usr/local/bin/rustyclint

EXPOSE 3000

CMD ["rustyclint"]
