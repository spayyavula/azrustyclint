# Build stage
FROM rust:1.75-bookworm as builder

WORKDIR /app
COPY . .

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
