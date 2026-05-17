# megaTrainer - AI Agent Onboarding Platform

Production-ready local stack: **Bun** + **Elysia** (backend), **PostgreSQL** + **Drizzle** (persistence), **Angular 21** (frontend), **Ollama** (local LLM).

## Quick Start

### Prerequisites
- Bun >= 1.0 (install: https://bun.sh)
- Docker & Docker Compose
- Node.js 20.19+ or 22.12+ (for Angular CLI 21)

### 1. Setup Infrastructure

```bash
# Start Postgres, Ollama, the Ollama model bootstrapper, and pgAdmin
docker-compose up -d

# Verify services are healthy
docker-compose ps
```

Services:
- **PostgreSQL**: `postgresql://devuser:devpass@localhost:5432/megatrainer_db`
- **Ollama**: `http://localhost:11434`
- **pgAdmin**: `http://localhost:5050` (admin@megatrainer.local / admin)

On first startup, Docker Compose also runs a one-shot `ollama-model-init` service that pulls `gpt-oss:20b` into the shared Ollama volume. That initial pull can take a while and requires substantial disk space.

### 2. Install Dependencies

```bash
# Monorepo workspace install
bun install
```

### 3. Run Locally

#### Option A: Development Mode (Recommended)

```bash
# Terminal 1: Start API
cd apps/api
bun run dev

# Terminal 2: Start Angular (separate terminal)
cd apps/web
bun run dev
```

API will be available at `http://localhost:3000`
Angular app at `http://localhost:4200`

#### Option B: Docker API Container

```bash
# Build and run API in Docker
bun run docker:build
docker-compose up api ollama postgres

# Development server still runs bun dev:web in another terminal
bun run dev:web
```

### 4. Verify Stack

- **API Health**: `curl http://localhost:3000/health`
- **API Docs**: http://localhost:3000/swagger
- **Frontend**: http://localhost:4200
- **Database**: pgAdmin http://localhost:5050

## Project Structure

```
megatrainer/
├── apps/
│   ├── api/                 # Elysia backend (Bun runtime)
│   │   └── src/index.ts
│   └── web/                 # Angular standalone app
│       └── src/app/
├── services/
│   └── agent-core/          # Interview orchestration logic
│       ├── src/
│       │   ├── handleQsAndComments.ts
│       │   ├── getBasicInfoPhase.ts
│       │   └── ...
├── packages/
│   └── shared-contracts/    # Shared TypeScript types
├── docker/
│   └── Dockerfile.api       # Multi-stage Bun builder
├── docker-compose.yml
└── package.json             # Workspace root
```

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

**api/.env:**
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://devuser:devpass@localhost:5432/megatrainer_db
OLLAMA_ENDPOINT=http://localhost:11434
JWT_SECRET=dev-secret-change-in-production
```

**web/.env:**
```
NG_APP_API_URL=http://localhost:3000
NG_APP_WS_URL=http://localhost:3000
```

## Key Architecture

### Backend (Bun + Elysia)
- Health checks with dependency status
- Auth endpoints (JWT: register, login, refresh)
- Interview session orchestration
- Q&A routing and pending queue handling
- SSE streaming for real-time responses

### Frontend (Angular 21 + Signals)
- Standalone components
- Reactive signals for state management
- Real-time SSE client integration
- Onboarding chat UI

### Database (PostgreSQL + Drizzle)
- Users, interview sessions, messages
- Pending questions queue
- Training programs (JSONB flexible schema)
- Audit log

### Agent Core (Bun TypeScript)
- Current: In-memory onboarding simulator
- Migration: Port to backend Interview Orchestrator service
- Responsibility: Phase transitions, response classification, LLM routing

## Development Workflow

### Running Tests

```bash
bun test                    # All workspaces
cd apps/api && bun test    # API only
```

### Formatting & Linting

```bash
# Format
bun run format

# Lint
bun run lint
```

### Database Migrations

```bash
cd apps/api
bunx drizzle-kit studio   # GUI migration tool
bunx drizzle-kit migrate  # Apply schemas
```

### Building for Production

```bash
bun run build              # Build API and web
docker build -t megatrainer:latest -f docker/Dockerfile.api .
```

## Deployment

### Local Docker
```bash
docker-compose -f docker-compose.yml up -d api
```

### Remote Production
Same Dockerfile works with environment variable substitution:

```bash
docker run -e DATABASE_URL="postgres://user:pass@host/db" \
           -e OLLAMA_ENDPOINT="https://api.example.com/llm" \
           -e JWT_SECRET="production-secret" \
           -p 3000:3000 \
           megatrainer:latest
```

## Troubleshooting

### API won't start
```bash
# Check database is healthy
docker-compose logs postgres

# Check Ollama is accessible
curl http://localhost:11434/api/tags

# Check model bootstrap status
docker-compose logs ollama-model-init
```

### Angular build fails
```bash
# Clear cache and reinstall
rm -rf node_modules
bun install
```

### Database migration errors
```bash
# Reset the local Postgres volume to a blank database
docker-compose down -v
docker-compose up -d postgres

# Then apply schema explicitly via Drizzle
cd apps/api
bunx drizzle-kit migrate
```

## Next Steps

1. **Phase 1**: Port existing agent flow to backend services ✓ (in progress)
2. **Phase 2**: Add JWT auth and session persistence
3. **Phase 3**: Implement SSE streaming and real-time chat UI
4. **Phase 4**: Add reliability hardening (retries, circuit breakers, telemetry)
5. **Phase 5**: Optimize LLM integration and add prompt versioning

## Resources

- **Bun**: https://bun.sh/docs
- **Elysia**: https://elysiajs.com
- **Angular 21**: https://angular.dev
- **Drizzle**: https://orm.drizzle.team
- **PostgreSQL**: https://www.postgresql.org/docs
- **Ollama**: https://ollama.ai

---

**Status**: MVP in progress | **Last Updated**: 2026-04-06
