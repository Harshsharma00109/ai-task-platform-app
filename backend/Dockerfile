# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# ---- Production Stage ----
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

WORKDIR /app

COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --chown=nodeuser:nodejs . .

RUN mkdir -p logs && chown nodeuser:nodejs logs

USER nodeuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health/live || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
