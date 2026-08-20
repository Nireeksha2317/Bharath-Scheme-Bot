# Stage 1: Base image
FROM node:20-alpine AS base
WORKDIR /app
# Install sqlite dependencies
RUN apk add --no-cache python3 make g++ sqlite

# Stage 2: Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 3: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# We need a DATABASE_URL for drizzle-kit during build if it checks config, but generally not needed for just tsc/vite build
ENV DATABASE_URL="file:database.db"
RUN npm run build

# Stage 4: Production Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5000

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 reactapp

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./
# Copy drizzle config and schema for db pushing at startup if needed
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle ./drizzle

# Install only production dependencies
RUN npm ci --omit=dev

# Change ownership to the non-root user
RUN chown -R reactapp:nodejs /app

USER reactapp

EXPOSE 5000

CMD ["npm", "start"]
