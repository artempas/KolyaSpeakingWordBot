FROM node:18-alpine

WORKDIR /app

# Copy admin source
COPY ./admin ./admin

# Copy entity source
COPY ./entity ./entity

# Copy .env file to root
COPY .env .env

# Install dependencies for entity and build it
WORKDIR /app/entity
RUN npm install && npm run build

# Install dependencies for admin and build it
WORKDIR /app/admin
RUN npm install && npm run build

# Set working directory to admin and start the app
WORKDIR /app/admin
CMD ["npm", "run", "start"]