# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY src/ ./src/
COPY index.html ./
COPY vite.config.js ./

RUN npm run build

# Runtime stage
FROM node:20-alpine AS runtime

WORKDIR /app

COPY package.json ./
RUN npm install

COPY --from=builder /app/dist ./dist
COPY vite.config.js ./

EXPOSE 3000

CMD ["npm", "run", "preview"]
