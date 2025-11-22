# Node.js sandbox image (JavaScript/TypeScript)
FROM rustyclint/sandbox-base:latest

USER root

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install TypeScript and LSP
RUN npm install -g typescript ts-node typescript-language-server

USER sandbox
