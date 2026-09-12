FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker

RUN npx prisma generate --schema=./prisma/schema.prisma

CMD ["npm", "run", "worker"]