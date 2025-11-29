# Java sandbox image
ARG BASE_IMAGE=rustyclint/sandbox-base:latest
FROM ${BASE_IMAGE}

USER root

# Install OpenJDK
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

USER sandbox
