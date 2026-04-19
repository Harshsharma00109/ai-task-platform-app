"""
AI Task Processing Worker
Consumes jobs from Redis (BullMQ-compatible) and processes them.
Supports multiple replicas running concurrently.
"""

import os
import json
import time
import signal
from datetime import datetime, timezone

import redis
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from bson import ObjectId
from dotenv import load_dotenv
import structlog

load_dotenv()

# ── Structured Logging ──────────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
log = structlog.get_logger()

# ── Config ───────────────────────────────────────────────────────────────────
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD") or None
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/ai_task_platform")
QUEUE_NAME = "task-processing"
WORKER_CONCURRENCY = int(os.getenv("WORKER_CONCURRENCY", 5))
POLL_INTERVAL = float(os.getenv("POLL_INTERVAL_SECONDS", 0.5))

# BullMQ key patterns
WAIT_KEY = f"bull:{QUEUE_NAME}:wait"
ACTIVE_KEY = f"bull:{QUEUE_NAME}:active"
COMPLETED_KEY = f"bull:{QUEUE_NAME}:completed"
FAILED_KEY = f"bull:{QUEUE_NAME}:failed"


# ── Database & Redis Connections ─────────────────────────────────────────────
def get_mongo_db():
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000)
    db_name = MONGODB_URI.rsplit("/", 1)[-1].split("?")[0]
    return client[db_name]


def get_redis_client():
    return redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        decode_responses=True,
        socket_connect_timeout=10,
        socket_timeout=10,
        retry_on_timeout=True,
    )


# ── Task Processing Logic ────────────────────────────────────────────────────
def process_operation(input_text: str, operation: str) -> tuple[str, list[dict]]:
    """Execute the task operation and return (result, logs)."""
    logs = []

    def add_log(level: str, message: str):
        logs.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "message": message,
        })

    add_log("info", f"Starting operation: {operation}")

    if operation == "uppercase":
        result = input_text.upper()
        add_log("info", f"Converted {len(input_text)} characters to uppercase")

    elif operation == "lowercase":
        result = input_text.lower()
        add_log("info", f"Converted {len(input_text)} characters to lowercase")

    elif operation == "reverse":
        result = input_text[::-1]
        add_log("info", f"Reversed string of {len(input_text)} characters")

    elif operation == "word_count":
        words = input_text.split()
        word_freq = {}
        for word in words:
            w = word.strip(".,!?;:\"'").lower()
            if w:
                word_freq[w] = word_freq.get(w, 0) + 1

        top_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        result = json.dumps({
            "total_words": len(words),
            "unique_words": len(word_freq),
            "character_count": len(input_text),
            "top_words": [{"word": w, "count": c} for w, c in top_words],
        }, indent=2)
        add_log("info", f"Counted {len(words)} words, {len(word_freq)} unique")

    else:
        raise ValueError(f"Unknown operation: {operation}")

    add_log("info", "Operation completed successfully")
    return result, logs


# ── BullMQ Job Fetching ──────────────────────────────────────────────────────
def fetch_next_job(r: redis.Redis) -> tuple[str | None, dict | None]:
    """
    Atomically move a job from the wait list to active using BRPOPLPUSH.
    Returns (job_id, job_data) or (None, None).
    """
    job_id = r.brpoplpush(WAIT_KEY, ACTIVE_KEY, timeout=1)
    if not job_id:
        return None, None

    job_key = f"bull:{QUEUE_NAME}:{job_id}"
    raw = r.hgetall(job_key)
    if not raw:
        # Stale reference — remove from active
        r.lrem(ACTIVE_KEY, 1, job_id)
        return None, None

    try:
        data = json.loads(raw.get("data", "{}"))
    except (json.JSONDecodeError, TypeError):
        data = {}

    return job_id, {"id": job_id, "data": data, "raw": raw}


def mark_job_completed(r: redis.Redis, job_id: str):
    r.lrem(ACTIVE_KEY, 1, job_id)
    r.lpush(COMPLETED_KEY, job_id)
    r.ltrim(COMPLETED_KEY, 0, 999)  # keep last 1000 completed


def mark_job_failed(r: redis.Redis, job_id: str, error: str):
    job_key = f"bull:{QUEUE_NAME}:{job_id}"
    r.hset(job_key, "failedReason", error)
    r.lrem(ACTIVE_KEY, 1, job_id)
    r.lpush(FAILED_KEY, job_id)


# ── MongoDB Update Helpers ───────────────────────────────────────────────────
def update_task_running(db, task_id: str, started_at: datetime):
    db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {"status": "running", "startedAt": started_at},
            "$push": {
                "logs": {
                    "timestamp": started_at,
                    "level": "info",
                    "message": "Worker picked up task. Processing started.",
                }
            },
        },
    )


def update_task_success(db, task_id: str, result: str, logs: list, processing_ms: int):
    now = datetime.now(timezone.utc)
    log_entries = [
        {
            "timestamp": datetime.fromisoformat(entry["timestamp"].replace("Z", "+00:00"))
            if isinstance(entry["timestamp"], str)
            else entry["timestamp"],
            "level": entry["level"],
            "message": entry["message"],
        }
        for entry in logs
    ]
    db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "status": "success",
                "result": result,
                "completedAt": now,
                "processingTimeMs": processing_ms,
            },
            "$push": {"logs": {"$each": log_entries}},
        },
    )


def update_task_failed(db, task_id: str, error_message: str):
    now = datetime.now(timezone.utc)
    db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "status": "failed",
                "errorMessage": error_message,
                "completedAt": now,
            },
            "$push": {
                "logs": {
                    "timestamp": now,
                    "level": "error",
                    "message": f"Task failed: {error_message}",
                }
            },
        },
    )


# ── Core Worker Loop ─────────────────────────────────────────────────────────
class Worker:
    def __init__(self):
        self.running = True
        self.redis = get_redis_client()
        self.db = get_mongo_db()
        self.processed = 0
        self.failed = 0

    def handle_signal(self, signum, frame):
        log.info("shutdown_signal_received", signal=signum)
        self.running = False

    def process_job(self, job_id: str, job_data: dict):
        data = job_data.get("data", {})
        task_id = data.get("taskId")

        if not task_id:
            log.error("job_missing_task_id", job_id=job_id)
            mark_job_failed(self.redis, job_id, "Missing taskId in job data")
            return

        log.info("job_started", job_id=job_id, task_id=task_id, operation=data.get("operation"))
        started_at = datetime.now(timezone.utc)

        try:
            update_task_running(self.db, task_id, started_at)

            input_text = data.get("inputText", "")
            operation = data.get("operation", "")

            result, logs = process_operation(input_text, operation)

            elapsed_ms = int((datetime.now(timezone.utc) - started_at).total_seconds() * 1000)

            update_task_success(self.db, task_id, result, logs, elapsed_ms)
            mark_job_completed(self.redis, job_id)

            self.processed += 1
            log.info("job_completed", job_id=job_id, task_id=task_id, elapsed_ms=elapsed_ms)

        except PyMongoError as e:
            log.error("mongo_error", job_id=job_id, task_id=task_id, error=str(e))
            try:
                update_task_failed(self.db, task_id, f"Database error: {str(e)}")
            except Exception:
                pass
            mark_job_failed(self.redis, job_id, str(e))
            self.failed += 1

        except Exception as e:
            log.error("job_failed", job_id=job_id, task_id=task_id, error=str(e))
            try:
                update_task_failed(self.db, task_id, str(e))
            except Exception:
                pass
            mark_job_failed(self.redis, job_id, str(e))
            self.failed += 1

    def run(self):
        signal.signal(signal.SIGTERM, self.handle_signal)
        signal.signal(signal.SIGINT, self.handle_signal)

        log.info(
            "worker_started",
            queue=QUEUE_NAME,
            redis_host=REDIS_HOST,
            concurrency=WORKER_CONCURRENCY,
        )

        while self.running:
            try:
                job_id, job_data = fetch_next_job(self.redis)
                if job_id and job_data:
                    self.process_job(job_id, job_data)
                else:
                    time.sleep(POLL_INTERVAL)
            except redis.exceptions.ConnectionError as e:
                log.warning("redis_connection_lost", error=str(e))
                time.sleep(5)
                try:
                    self.redis = get_redis_client()
                    log.info("redis_reconnected")
                except Exception:
                    pass
            except Exception as e:
                log.error("worker_loop_error", error=str(e))
                time.sleep(1)

        log.info("worker_stopped", processed=self.processed, failed=self.failed)


if __name__ == "__main__":
    worker = Worker()
    worker.run()
