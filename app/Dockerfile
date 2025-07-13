# Build stage
FROM node:18-alpine

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