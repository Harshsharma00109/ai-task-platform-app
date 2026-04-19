# ⚡ NeuralQ — AI Task Processing Platform

A production-grade, full-stack platform for queuing and processing AI text operations at scale. Built with the MERN stack, Redis/BullMQ job queue, Python workers, and GitOps deployment via Kubernetes + Argo CD.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│              React + Zustand + TanStack Query                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST
┌──────────────────────────▼──────────────────────────────────────┐
│                     NGINX (Frontend)                             │
│           Static SPA + Reverse Proxy to Backend                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   Node.js / Express API                          │
│    Auth │ Task CRUD │ BullMQ Producer │ Rate Limiting            │
└──────┬───────────────────┬────────────────────────┬─────────────┘
       │                   │                        │
┌──────▼──────┐   ┌────────▼────────┐   ┌──────────▼──────────┐
│   MongoDB   │   │   Redis (Queue) │   │   BullMQ Dashboard  │
│  (Mongoose) │   │  bull:task-*    │   │   (optional)        │
└─────────────┘   └────────┬────────┘   └─────────────────────┘
                           │ BRPOPLPUSH
              ┌────────────▼───────────────┐
              │     Python Workers (×N)     │
              │  process_operation()        │
              │  update MongoDB status      │
              │  emit logs with timestamps  │
              └─────────────────────────────┘
```

### Request Flow

1. **User** creates a task via the React dashboard
2. **Backend** saves task with `status: pending` to MongoDB
3. **Backend** enqueues job to Redis via BullMQ
4. **Python Worker** atomically pops job (`BRPOPLPUSH`) → sets `status: running`
5. **Worker** executes the operation and updates MongoDB (`status: success/failed`) with logs
6. **Frontend** auto-refreshes every 3 seconds to show live status

---

## 📁 Project Structure

```
ai-task-platform/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── app.js              # Express app setup (helmet, cors, rate-limit)
│   │   ├── server.js           # Bootstrap & graceful shutdown
│   │   ├── config/
│   │   │   ├── database.js     # Mongoose connection
│   │   │   └── redis.js        # ioredis client + BullMQ connection factory
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   └── task.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js    # JWT verify
│   │   │   ├── validate.middleware.js# express-validator errors
│   │   │   └── error.middleware.js   # Global error handler
│   │   ├── models/
│   │   │   ├── user.model.js   # bcrypt password hashing
│   │   │   └── task.model.js   # Compound indexes
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── task.routes.js
│   │   │   └── health.routes.js
│   │   ├── services/
│   │   │   └── queue.service.js     # BullMQ producer
│   │   └── utils/
│   │       ├── jwt.js
│   │       ├── logger.js            # Winston structured logging
│   │       └── response.js          # Standardized API responses
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── App.jsx             # Router with protected/public routes
│   │   ├── main.jsx            # QueryClient, Toaster bootstrap
│   │   ├── index.css           # Tailwind + custom design tokens
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx   # Stats + recent tasks
│   │   │   └── TasksPage.jsx       # Full CRUD + filters + detail drawer
│   │   ├── components/
│   │   │   └── dashboard/
│   │   │       └── DashboardLayout.jsx  # Sidebar + Topbar
│   │   ├── services/
│   │   │   └── api.js          # Axios instance + auth interceptors
│   │   └── store/
│   │       └── auth.store.js   # Zustand persisted auth state
│   ├── nginx.conf
│   ├── Dockerfile
│   └── vite.config.js
│
├── worker/                     # Python 3.12 background processor
│   ├── src/
│   │   └── worker.py           # BullMQ-compatible consumer + task logic
│   ├── requirements.txt
│   └── Dockerfile
│
├── infra/                      # GitOps infrastructure
│   ├── k8s/
│   │   ├── base/               # Kustomize base manifests
│   │   │   ├── namespace.yaml
│   │   │   ├── configmap.yaml
│   │   │   ├── secrets.yaml    # Template only — use sealed-secrets in prod
│   │   │   ├── mongo.yaml      # StatefulSet + headless service
│   │   │   ├── redis.yaml      # Deployment + PVC
│   │   │   ├── backend.yaml    # Deployment + Service + HPA
│   │   │   ├── worker.yaml     # Deployment + HPA
│   │   │   ├── frontend.yaml   # Deployment + Service
│   │   │   └── ingress.yaml    # NGINX Ingress + TLS
│   │   └── overlays/
│   │       └── production/
│   │           └── kustomization.yaml
│   └── argocd/
│       └── application.yaml    # Argo CD App with auto-sync
│
├── scripts/
│   └── mongo-init.js           # Index creation on first boot
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # Lint → Build → Push → Update tags
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Docker Compose)

### Prerequisites
- Docker ≥ 24.x
- Docker Compose ≥ 2.x

### 1. Clone and configure

```bash
git clone https://github.com/YOUR_ORG/neuralq.git
cd neuralq

# Copy environment templates
cp backend/.env.example backend/.env
cp worker/.env.example  worker/.env

# Set a strong JWT secret in backend/.env:
# JWT_SECRET=your_super_strong_secret_min_32_chars
```

### 2. Start all services

```bash
docker compose up --build -d
```

This starts:
| Service   | Port  | Description                    |
|-----------|-------|-------------------------------|
| Frontend  | :80   | React SPA via NGINX            |
| Backend   | :5000 | Express API (internal)         |
| Worker    | —     | 2 Python worker replicas       |
| MongoDB   | :27017| Database (internal)            |
| Redis     | :6379 | Job queue (internal)           |

### 3. Open the app

```
http://localhost
```

Register an account, create tasks, and watch them process in real time.

### 4. Scale workers on the fly

```bash
docker compose up --scale worker=5 -d
```

### 5. View logs

```bash
docker compose logs -f backend
docker compose logs -f worker
```

---

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (EKS / GKE / AKS / k3s)
- `kubectl` configured
- `kustomize` ≥ 5.x
- NGINX Ingress Controller installed
- cert-manager installed (for TLS)

### 1. Update configuration

Edit `infra/k8s/base/configmap.yaml` — set your domain in `ALLOWED_ORIGINS`.

Edit `infra/k8s/base/secrets.yaml` — set your `JWT_SECRET`.

> ⚠️ **Production**: Use [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) or [External Secrets Operator](https://external-secrets.io) instead of plaintext secrets.

### 2. Deploy with Kustomize

```bash
# Update image tags first
cd infra/k8s/overlays/production
# Edit kustomization.yaml to set correct image tags

kubectl apply -k infra/k8s/overlays/production/
```

### 3. Verify

```bash
kubectl get pods -n neuralq
kubectl get ingress -n neuralq
kubectl logs -f deployment/backend -n neuralq
```

---

## 🔄 Argo CD GitOps Setup

### 1. Install Argo CD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 2. Update the application manifest

Edit `infra/argocd/application.yaml`:
- Set `repoURL` to your infra repository
- Set `targetRevision` (branch or tag)

### 3. Apply the Argo CD Application

```bash
kubectl apply -f infra/argocd/application.yaml
```

Argo CD will now:
- **Watch** your Git repo for changes
- **Auto-sync** when `kustomization.yaml` is updated (by CI/CD)
- **Self-heal** if someone manually edits the cluster

### 4. Access the Argo CD UI

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Login: admin / (initial password from argocd-initial-admin-secret)
```

---

## ⚙️ CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) runs on every push to `main`:

```
push to main
     │
     ├─ lint-backend   (ESLint)
     ├─ lint-frontend  (ESLint)
     └─ lint-worker    (flake8)
          │ (all pass)
          ▼
     build-and-push
     ├─ Build backend  Docker image → ghcr.io/ORG/neuralq-backend:SHA
     ├─ Build frontend Docker image → ghcr.io/ORG/neuralq-frontend:SHA
     └─ Build worker   Docker image → ghcr.io/ORG/neuralq-worker:SHA
          │
          ▼
     update-manifests
     └─ Patch kustomization.yaml with new image tags → git commit → push
          │
          ▼ (Argo CD detects Git change)
     auto-deploy to production cluster ✅
```

---

## 📊 Scaling to 100k Tasks/Day

### Throughput Math

```
100,000 tasks/day ÷ 86,400 seconds = ~1.16 tasks/second peak
With 5× burst factor → ~6 tasks/second sustained target
```

### Worker Scaling Strategy

Each Python worker processes ~10–50 tasks/second depending on operation complexity. To handle 100k/day:

| Configuration | Capacity |
|---|---|
| 2 worker pods × 5 concurrency | ~50–100 tasks/sec |
| 5 worker pods × 5 concurrency | ~125–250 tasks/sec |
| HPA auto-scales 2→20 pods on CPU | burst-ready |

**Horizontal Pod Autoscaler** scales workers based on CPU (target 60%). For queue-depth-based scaling, integrate [KEDA](https://keda.sh) with the Redis list length as the scaling metric:

```yaml
# KEDA ScaledObject (optional advanced setup)
triggers:
  - type: redis
    metadata:
      listName: bull:task-processing:wait
      listLength: "10"   # scale up when >10 jobs waiting
```

### MongoDB Indexing Strategy

All critical query paths are covered by compound indexes:

```
{ userId: 1, createdAt: -1 }           → task list (sorted)
{ userId: 1, status: 1, createdAt: -1 } → filtered task list
{ status: 1 }                           → admin / stats queries
{ jobId: 1 }                            → job lookup (sparse)
```

For 100k tasks/day at 30-day retention = ~3M documents. Add **TTL index** for automatic cleanup:

```javascript
db.tasks.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
```

### Redis Failure Recovery

BullMQ uses the `active` list for in-flight jobs. If a worker crashes mid-job:

1. The job stays in `bull:task-processing:active` (not completed/failed)
2. On worker restart, implement a **stalled job checker**:

```python
# Add to worker startup: move stalled active jobs back to wait
stalled = r.lrange("bull:task-processing:active", 0, -1)
for job_id in stalled:
    r.lrem("bull:task-processing:active", 1, job_id)
    r.lpush("bull:task-processing:wait", job_id)
```

3. Use **Redis Sentinel** or **Redis Cluster** for HA in production
4. Enable Redis `AOF` persistence (`appendonly yes`) to survive restarts

### Staging vs Production

| Aspect | Staging | Production |
|---|---|---|
| Replicas (backend) | 1 | 2–10 (HPA) |
| Replicas (worker) | 1 | 3–20 (HPA/KEDA) |
| MongoDB | Single node | Atlas M10+ or replica set |
| Redis | Single node | Redis Sentinel / Elasticache |
| TLS | Self-signed | cert-manager + Let's Encrypt |
| Image tags | `develop-SHA` | `main-SHA` |
| Resource limits | Relaxed | Strict |
| Secrets | K8s Secret | External Secrets Operator |

---

## 🔒 Security

- **Helmet.js** sets secure HTTP headers on all responses
- **bcrypt** (cost factor 12) for password hashing
- **JWT** with 7-day expiry; token invalidated on logout (client-side)
- **Rate limiting**: 100 req/15min globally; 20 req/15min on auth endpoints
- **Input validation** via `express-validator` on all endpoints
- **Non-root Docker users** in all service containers
- **CORS** restricted to configured allowed origins
- **Request size limit** of 10KB on API payloads

---

## 🧪 Development

### Backend

```bash
cd backend
npm install
cp .env.example .env   # configure values
npm run dev            # nodemon hot-reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # Vite dev server on :3000
```

### Worker

```bash
cd worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python src/worker.py
```

### Infrastructure dependencies only

```bash
docker compose up mongo redis -d
```

---

## 📡 API Reference

### Auth

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{name, email, password}` | Register user |
| POST | `/api/auth/login` | `{email, password}` | Login |
| GET | `/api/auth/me` | — (JWT) | Current user |

### Tasks

All task routes require `Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/tasks` | List tasks (paginated, filterable) |
| POST | `/api/tasks` | Create & queue task |
| GET | `/api/tasks/stats` | Aggregate statistics |
| GET | `/api/tasks/:id` | Get task detail |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/retry` | Retry failed task |

#### Query params for GET /api/tasks

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `status` | string | — | Filter: `pending\|running\|success\|failed\|all` |
| `search` | string | — | Search title/input text |
| `sortBy` | string | `createdAt` | Sort field |
| `sortOrder` | string | `desc` | `asc\|desc` |

#### Supported Operations

| Operation | Description | Result type |
|---|---|---|
| `uppercase` | Convert to UPPERCASE | String |
| `lowercase` | Convert to lowercase | String |
| `reverse` | Reverse the string | String |
| `word_count` | Word frequency analysis | JSON object |

---

## 📦 Environment Variables

### Backend

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `5000` | HTTP port |
| `MONGODB_URI` | — | MongoDB connection string |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_SECRET` | — | **Required**: min 32 chars |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `ALLOWED_ORIGINS` | — | Comma-separated CORS origins |

### Worker

| Variable | Default | Description |
|---|---|---|
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `MONGODB_URI` | — | MongoDB connection string |
| `WORKER_CONCURRENCY` | `5` | Jobs per worker instance |
| `POLL_INTERVAL_SECONDS` | `0.5` | Poll delay when queue is empty |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, TanStack Query, Axios |
| Backend | Node.js 20, Express 4, BullMQ 5, Mongoose 8, Helmet, Winston |
| Database | MongoDB 7 |
| Queue | Redis 7, BullMQ |
| Worker | Python 3.12, pymongo, structlog |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Containerization | Docker (multi-stage), Docker Compose |
| Orchestration | Kubernetes (Kustomize, HPA, StatefulSet) |
| GitOps | Argo CD (auto-sync, self-heal) |
| CI/CD | GitHub Actions |
| Ingress | NGINX Ingress Controller + cert-manager |

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
