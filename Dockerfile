FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# 1. Instalar dependencias
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# 2. Copiar código fuente y compilar
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npx prisma generate
RUN npm run build

# 3. Preparar imagen final
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node scripts/prepare-db.js && npm start"]

