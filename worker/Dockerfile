# ---- Builder Stage ----
FROM python:3.12-slim AS builder

WORKDIR /app
RUN pip install --upgrade pip
COPY requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

# ---- Production Stage ----
FROM python:3.12-slim AS production

RUN addgroup --gid 1001 pygroup && \
    adduser --uid 1001 --gid 1001 --no-create-home --disabled-password pyuser

WORKDIR /app

COPY --from=builder /install /usr/local
COPY --chown=pyuser:pygroup src/ ./src/

USER pyuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import redis, os; r = redis.Redis(host=os.getenv('REDIS_HOST','redis'), port=int(os.getenv('REDIS_PORT',6379))); r.ping()" || exit 1

CMD ["python", "-u", "src/worker.py"]
