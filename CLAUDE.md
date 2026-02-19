# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (hot-reload via ts-node-dev)
npm run dev

# Build TypeScript to dist/
npm run build

# Run production build
npm start

# Lint
npm run lint
```

There are no tests configured in this project.

## Environment

Create a `.env` file with:
```
PORT=4000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
NODE_ENV=development
```

## Architecture

This is a **Node.js + TypeScript** REST API using **Domain-Driven Design (DDD)** and **Vertical Slice Architecture**. Each module (`quiz`, `category`, `questionBank`, `liveEvents`) is self-contained.

**Request flow:**
```
HTTP → Controller (infra/http/controllers/) → Use Case (application/useCases/) → Domain → Repository (infra/db/) → MongoDB
```

**Module layout** (using `quiz` as example):
```
src/modules/quiz/
├── domain/              # Entities (Quiz, Question, Option) and Value Objects (QuizTitle, etc.)
├── application/useCases/  # One folder per use case (createQuiz/, updateQuiz/, etc.)
├── infra/
│   ├── db/              # Mongoose model + repository implementation
│   └── http/
│       ├── controllers/ # One controller class per use case
│       └── quizRoutes.ts  # Wires repo → use cases → controllers → Express routes
└── mappers/             # QuizMap: converts between domain ↔ persistence ↔ DTO
```

**Shared utilities** (`src/shared/core/`):
- `Result<T>` — success/failure wrapper. Use `Result.ok(value)` / `Result.fail("message")`. Call `.getValue()` on success, `.errorValue()` on failure.
- `BaseController` — abstract class with helpers: `this.ok(dto)`, `this.created()`, `this.clientError()`, `this.notFound()`, `this.fail()`, etc.
- `Guard` — null/undefined checks.
- `UseCase<IRequest, IResponse>` — base interface for use cases.
- `ValueObject<T>` — base for value objects.

**Value Objects** validate on construction and return `Result<ValueObject>`. Example: `QuizTitle.create(raw)` returns `Result<QuizTitle>`. Domain entities are immutable — mutation methods return new instances.

**Routes files** instantiate the dependency chain directly (no DI container): `new MongoQuizRepository()` → `new CreateQuizUseCase(repo)` → `new CreateQuizController(useCase)`.

## Modules

### quiz
Full DDD slice. CRUD endpoints at `/api/v1/quizzes`. Persisted to MongoDB.

### category
Full DDD slice. CRUD endpoints at `/api/v1/categories`. Persisted to MongoDB.

### questionBank
Two parallel implementations exist:
- `src/modules/quiz/infra/http/questionBankRoutes.ts` — **in-memory only**, currently registered in `app.ts`. Data is lost on restart.
- `src/modules/questionBank/` — full DDD structure with MongoDB persistence, but **not yet wired into `app.ts`**.

### liveEvents
Hybrid module — REST + Socket.IO:
- **REST** (`src/modules/liveEvents/infra/http/liveEventRoutes.ts`): `POST /api/v1/live-events` creates an event and returns an `adminToken`; `GET /api/v1/live-events/:eventCode` returns event state.
- **Socket.IO** (`src/socket/liveEventHandlers.ts`): handles real-time quiz sessions. Quiz question data is cached **in-memory** (a `Map` keyed by `eventCode`) — not persisted. The admin authenticates each socket action via `adminToken`.

**Socket events:**
- `event:join` — participant joins a room
- `event:adminJoin` — admin joins, uploads quiz snapshot to in-memory cache
- `event:setActiveQuestion` — admin advances the question (persists index to MongoDB, broadcasts to room)
- `event:showQuestion` — admin toggles question visibility
- `event:answer` — participant submits an answer (persists to MongoDB, broadcasts updated results)

## Deployment

Deployed to **Fly.io**. GitHub Actions (`.github/workflows/fly-deploy.yml`) deploys automatically on push to `main`. Uses `FLY_API_TOKEN` secret.

CORS allows `http://localhost:5173` and `https://mfquiz-web.fly.dev`. Note: Socket.IO CORS currently only lists `http://localhost:5173` (production origin not included).
