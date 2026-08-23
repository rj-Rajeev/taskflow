FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY prisma ./prisma
COPY apps/api ./apps/api
COPY apps/worker/queue.js ./apps/worker/queue.js

RUN npx prisma generate --schema=./prisma/schema.prisma

EXPOSE 3000

CMD ["npm", "run", "api"]