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

# Run tests
npm test
```

## Environment

Start a local Postgres with Docker: `docker compose up -d` (see `docker-compose.yml`; matches the `DATABASE_URL` default below).

Create a `.env` file (see `.env.example`) with:
```
PORT=4000
DATABASE_URL=postgres://quizmeapi:quizmeapi@localhost:5432/quizmeapi
NODE_ENV=development
```

Run `npm run db:migrate` after setting `DATABASE_URL` to create/update the Postgres schema (idempotent — safe to re-run).

## Architecture

This is a **Node.js + TypeScript** REST API using **Domain-Driven Design (DDD)** and **Vertical Slice Architecture**. Each module (`quiz`, `category`, `questionBank`, `liveEvents`, `department`, `location`, `host`, `session`, `analytics`) is self-contained.

**Single datastore: Postgres.** Every module persists via raw `pg` queries in `infra/db/Pg*Repository.ts` (no ORM). Schema lives in `src/shared/infra/postgres/schema.sql`; the pool is `src/shared/infra/postgres/pgClient.ts`. MongoDB/Mongoose has been fully retired.

**Request flow:**
```
HTTP → Controller (infra/http/controllers/) → Use Case (application/useCases/) → Domain → Repository (infra/db/) → Postgres
```

**Module layout** (using `quiz` as example):
```
src/modules/quiz/
├── domain/              # Entities (Quiz, Question, Option) and Value Objects (QuizTitle, etc.)
├── application/useCases/  # One folder per use case (createQuiz/, updateQuiz/, etc.)
├── infra/
│   ├── db/              # PgQuizRepository (raw pg queries) implementing IQuizRepository
│   └── http/
│       ├── controllers/ # One controller class per use case
│       └── quizRoutes.ts  # Wires repo → use cases → controllers → Express routes
└── mappers/             # QuizMap: converts between Postgres rows ↔ domain ↔ DTO
```

**Shared utilities** (`src/shared/core/`):
- `Result<T>` — success/failure wrapper. Use `Result.ok(value)` / `Result.fail("message")`. Call `.getValue()` on success, `.errorValue()` on failure.
- `BaseController` — abstract class with helpers: `this.ok(dto)`, `this.created()`, `this.clientError()`, `this.notFound()`, `this.fail()`, etc.
- `Guard` — null/undefined checks.
- `UseCase<IRequest, IResponse>` — base interface for use cases.
- `ValueObject<T>` — base for value objects.

**Value Objects** validate on construction and return `Result<ValueObject>`. Example: `QuizTitle.create(raw)` returns `Result<QuizTitle>`. Domain entities are immutable — mutation methods return new instances.

**Routes files** instantiate the dependency chain directly (no DI container): `new PgQuizRepository()` → `new CreateQuizUseCase(repo)` → `new CreateQuizController(useCase)`.

Multi-table aggregates (quiz questions/options/sections; question-bank options) are persisted with a "replace on save" strategy inside a transaction: the parent row is upserted, then child rows are deleted and reinserted, preserving any ids the client round-tripped from a prior load so cross-references (e.g. a section's `questionIds`) survive an edit. See `PgQuizRepository.save()` for the reference implementation.

## Modules

### quiz
Full DDD slice. CRUD endpoints at `/api/v1/quizzes`, plus `POST /api/v1/quizzes/:id/add-questions`. Persisted across `quizzes`/`quiz_questions`/`quiz_question_options`/`quiz_sections`/`quiz_section_questions`. A section groups a subset of its own quiz's questions by id (`{id, name, questionIds}`) — plain data, no fallback synthesis; a quiz with no authored sections simply returns an empty `sections` array.

### category
Full DDD slice. CRUD endpoints at `/api/v1/categories`. Persisted to the `categories` table.

### questionBank
Single implementation: `src/modules/questionBank/` (full DDD structure, Postgres-backed via `question_bank_questions`/`question_bank_options`), wired into `app.ts` as `/api/v1/question-bank`. (An earlier in-memory-only duplicate under `quiz/infra/http/` has been removed.)

### department / location / host
Simple named-list DDD slices on Postgres. `department` and `location` are full CRUD (`GET/POST /api/v1/departments|locations`, `PUT/DELETE /:id`); `host` is GET-all + create only (`/api/v1/hosts`). Used by the Session creation wizard's Audience and Delivery steps, and by the `analytics` module's comparison endpoints.

### session
The operational delivery of a reusable Training Template (see `SESSION.md`) — audience (departments/locations/allLocations), content (`sectionIds` referencing the template's sections), and delivery (host, session type, pass threshold, etc.). `sessions.template_id` is a real FK to `quizzes(id)`. Endpoints: `POST /api/v1/sessions`, `GET /api/v1/sessions`, `GET /api/v1/sessions/:id`. Sessions are created, not edited or deleted, per the business rules in `SESSION.md`.

### liveEvents
Hybrid module — REST + Socket.IO + a read-only dashboard:
- **REST** (`src/modules/liveEvents/infra/http/liveEventRoutes.ts`): `POST /api/v1/live-events` creates an event (optionally linked to a `sessions` row via `sessionId`) and returns an `adminToken`; `GET /api/v1/live-events/:eventCode` returns event state; `POST /api/v1/live-events/:eventCode/end` (admin-token authenticated) ends the event and, if it's linked to a session, folds its participants/responses into the generic `session_participant`/`session_attempt`/`session_response` tables the `analytics` module reads.
- **Socket.IO** (`src/socket/liveEventHandlers.ts`): handles real-time quiz sessions. The active quiz snapshot used for live scoring/validation is still cached ephemerally (Redis, or an in-memory `Map` fallback) — unchanged. Durable per-event data (participants, answers, an immutable question snapshot) is written to Postgres (`live_events`/`live_participants`/`live_responses`/`live_event_questions`) so it survives a restart and backs the dashboard below.
- **Dashboard** (`src/modules/liveEvents/infra/http/dashboardRoutes.ts`): `GET /api/v1/dashboard/:eventCode/{summary,participants,questions}` — read-only reporting over the tables above (participant scores, per-question correct rate/difficulty).

**Socket events:**
- `event:join` — participant joins a room
- `event:adminJoin` — admin joins, uploads quiz snapshot (Redis/memory) and persists the immutable question snapshot (Postgres)
- `event:setActiveQuestion` — admin advances the question (persists index to Postgres, broadcasts to room)
- `event:showQuestion` — admin toggles question visibility
- `event:answer` — participant submits an answer (a Postgres unique constraint on `(live_event_id, participant_id, question_index)` is the atomic one-answer-per-question gate; broadcasts updated results)

### analytics
Read-only reporting module backing the frontend's `AnalyticsAPI` (`src/modules/analytics/`), endpoints under `/api/v1/analytics`: `training-templates` (= quizzes), `sessions` (optionally filtered by `training_template_id`), and per-session `summary`/`alerts`/`top-problems`/`compare/departments`/`compare/locations`, plus per-template `trends`. All read from the generic `session_participant`/`session_attempt`/`session_response` tables, which today are populated only when a `live-quiz`-type session ends (see `liveEvents` above) — an `assessment`-type session with no recorded attempts yet returns honest zero/empty values, never mocked data. Alert thresholds (low pass rate, weak section, very difficult question) mirror the Notion "Analytics Data Dictionary" §11 suggested rules.

### testSession

SESSION-BE-002: timed organisational delivery of one immutable **published** Assessment (`test_sessions.assessment_id` — a published `assessments` row never changes again, so it already acts as an immutable "version" pointer; no separate `assessment_versions` table). Distinct bounded context from `session` (which delivers quiz templates via `liveEvents`) — nothing in `session`/`liveEvents`/`analytics`/`quiz` is touched by this module. A Test Session has one or more audience rules (`test_session_audiences`: location + department + optional, unmodeled team) which are resolved into explicit `test_session_participants` at creation time, snapshotting each participant's org assignment for historic reporting. Endpoints under `/api/v1/test-sessions` (`audience-preview`, CRUD-ish create/list/get, `:id/close`, `:id/cancel`, `:id/results`, `:id/analytics?groupBy=location|department|team`), `GET /api/v1/me/test-sessions` (participant discovery), and the attempt lifecycle (`POST /test-sessions/:sessionId/attempts`, `PUT /attempts/:attemptId/questions/:questionId/response`, `POST /attempts/:attemptId/submit`). Trainer/manager routes reuse the existing `session.*`/`participant.read` permission codes via the standard `requireAuthenticatedUser`/`requirePermission`/`applyEffectiveScope` pipeline; participant-facing attempt routes use only `requireAuthenticatedUser` and enforce ownership inside the use case instead (never grant access just because someone knows a Test Session id). The server owns attempt timing: `expires_at = min(started_at + timeLimitMinutes, availableUntil)`, checked on every response/submit call; an attempt found past its `expires_at` is finalized as `TIMED_OUT` on the next request that touches it (no background job). Unanswered questions score as incorrect. `completion_rate = completed / assigned` and `pass_rate = passed / completed` everywhere. Writes a minimal insert-only `audit_events` row (shared table, no read API yet) on session create/close/cancel and attempt submit.

## Deployment

Deployed to **Fly.io**. GitHub Actions (`.github/workflows/fly-deploy.yml`) deploys automatically on push to `main`. Uses `FLY_API_TOKEN` secret.

CORS (both Express and Socket.IO) allows `http://localhost:5173` and `https://mfquiz-web.fly.dev` by default, plus any origins in `CORS_EXTRA_ORIGINS` (comma-separated env var — see `src/shared/config/corsOrigins.ts`). Use `CORS_EXTRA_ORIGINS` to add a Cloudflare Tunnel hostname for mobile/device dev testing without code changes; leave it unset to stay on plain localhost. Outside `NODE_ENV=production`, any `localhost`/`127.0.0.1`/private-LAN origin (`10.x`, `172.16-31.x`, `192.168.x`) is also allowed on any port, and so is any `*.trycloudflare.com` quick-tunnel hostname — so testing Live Quiz from a phone (via LAN IP, a shifted Vite dev port, or a `cloudflared` quick tunnel) works without editing `.env` each time.
