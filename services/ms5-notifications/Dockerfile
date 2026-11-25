FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/common/package*.json ./packages/common/
COPY services/ms5-notifications/package*.json ./services/ms5-notifications/

RUN npm install

COPY packages/common ./packages/common
COPY services/ms5-notifications ./services/ms5-notifications

RUN npm run build --workspace=packages/common
RUN npm run build --workspace=services/ms5-notifications

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY packages/common/package*.json ./packages/common/
COPY services/ms5-notifications/package*.json ./services/ms5-notifications/

RUN npm install --omit=dev

COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/services/ms5-notifications/dist ./services/ms5-notifications/dist

EXPOSE 3005

CMD ["node", "services/ms5-notifications/dist/index.js"]
