##############################################
# Stage 1 — Build
##############################################
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run build
RUN npx prisma generate

##############################################
# Stage 2 — Production image
##############################################
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies (prisma is in dependencies now)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output and Prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Create uploads directory (mounted as volume in production)
RUN mkdir -p /app/uploads

# Expose the service port
EXPOSE 3002

# Run migrations then start the service
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
