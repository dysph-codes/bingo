# builder: собираем фронтенд и зависимости
FROM node:20-alpine AS builder
WORKDIR /app

# копируем манифесты и ставим зависимости для бэка и фронта
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

COPY . .

# собираем фронтенд
RUN cd frontend && npm run build

# финальный образ
FROM node:20-alpine AS production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY server.js .
COPY --from=builder /app/frontend/dist ./public

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
