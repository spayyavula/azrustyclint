# Build stage
FROM rust:1.82-bookworm AS builder

WORKDIR /app
COPY . .

# Pin base64ct to avoid edition2024 requirement
RUN cargo update -p base64ct --precise 1.6.0
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
