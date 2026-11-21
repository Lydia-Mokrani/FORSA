FROM node:22-alpine AS builder

WORKDIR /app

# Copie des configurations racine du monorepo
COPY package.json package-lock.json* ./
COPY packages/common/package.json ./packages/common/
COPY services/ms1-accounts/package.json ./services/ms1-accounts/

# Installation des dépendances
RUN npm install

# Copie des sources du package common et compilation
COPY packages/common/ ./packages/common/
RUN npm run build --workspace=packages/common

# Copie des sources de MS1 et génération Prisma
COPY services/ms1-accounts/ ./services/ms1-accounts/
WORKDIR /app/services/ms1-accounts
RUN npx prisma generate
RUN npm run build

# Stage final d'exécution
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY packages/common/package.json ./packages/common/
COPY services/ms1-accounts/package.json ./services/ms1-accounts/

RUN npm install --omit=dev

COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/services/ms1-accounts/dist ./services/ms1-accounts/dist
COPY --from=builder /app/services/ms1-accounts/node_modules/.prisma ./services/ms1-accounts/node_modules/.prisma
COPY --from=builder /app/services/ms1-accounts/prisma ./services/ms1-accounts/prisma
COPY --from=builder /app/services/ms1-accounts/openapi.yaml ./services/ms1-accounts/openapi.yaml

WORKDIR /app/services/ms1-accounts

RUN mkdir -p uploads/documents keys

EXPOSE 3001

CMD ["node", "dist/index.js"]
