FROM node:20-slim

# 開発に必要な基本パッケージ
RUN apt-get update && apt-get install -y git nano && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY . .

