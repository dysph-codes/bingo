# базовый слой: собираем фронтенд
FROM node:20-alpine AS builder
WORKDIR /app

# общие пакеты
COPY package.json package-lock.json ./
RUN npm ci

# фронтенд
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

# копируем весь исходник
COPY . .

# собираем фронтенд
RUN cd frontend && npm run build

# финальный образ
FROM node:20-alpine
WORKDIR /app

# копируем только нужное
COPY package.json package-lock.json ./
RUN npm ci --production

COPY server.js .
COPY tailwind.config.js .
COPY postcss.config.js .

# статические из билда
COPY --from=builder /app/frontend/dist ./public

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
