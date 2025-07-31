# builder: собираем фронтенд
FROM node:20-alpine AS builder
WORKDIR /app

# ставим бэки и фронт зависимости
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

COPY . .

# собираем фронтенд
RUN cd frontend && npm run build

# финальный рантайм
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY server.js .
# подставляем уже собранные статику
COPY --from=builder /app/frontend/dist ./public

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
