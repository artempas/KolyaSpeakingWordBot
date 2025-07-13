# Build stage
FROM node:18-alpine

WORKDIR /app

# Copy source files
COPY . .

# Build entity
RUN npm i -g pnpm
RUN pnpm i

WORKDIR /app/entity
RUN pnpm run build

WORKDIR /app/app
RUN pnpm run build

