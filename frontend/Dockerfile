# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npm run build

# ---- Production Stage (nginx) ----
FROM nginx:1.27-alpine AS production

RUN addgroup -g 1001 -S nginxgroup && \
    adduser -S nginxuser -u 1001 -G nginxgroup

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginxuser:nginxgroup /usr/share/nginx/html && \
    chown -R nginxuser:nginxgroup /var/cache/nginx && \
    chown -R nginxuser:nginxgroup /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginxuser:nginxgroup /var/run/nginx.pid

USER nginxuser

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
