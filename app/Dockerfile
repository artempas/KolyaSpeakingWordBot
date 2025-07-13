# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy source files
COPY ./app ./app
COPY ./entity ./entity
COPY .env .env

# Build entity
WORKDIR /app/entity
RUN npm install && npm run build

# Build admin
WORKDIR /app/app
RUN npm install && npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app/app

# Copy only built admin and node_modules from builder
COPY --from=builder /app/app/dist ./dist
COPY --from=builder /app/app/node_modules ./node_modules
COPY --from=builder /app/app/package.json ./package.json
COPY --from=builder /app/.env /app/app/.env