# Dockerfile for NestJS app
FROM node:18-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY ./docker.env ./.env
COPY *.json ./
RUN pnpm install
COPY src src
COPY prisma prisma
EXPOSE 3000
CMD ["pnpm", "run", "start:dev"]
