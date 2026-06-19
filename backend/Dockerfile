FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY src/ ./src/

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

CMD ["node", "src/server.js"]
