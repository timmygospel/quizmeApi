# API Audit — Existing Endpoints

Audit of the current REST + Socket.IO surface relative to dashboard requirements.
Produced as part of Sprint 1 (dashboard-analytics branch).

---

## Existing REST Endpoints

| Method | Path | Persistence | Status |
|--------|------|-------------|--------|
| GET    | `/health` | — | Active |
| POST   | `/api/v1/quizzes` | MongoDB | Active |
| GET    | `/api/v1/quizzes` | MongoDB | Active |
| GET    | `/api/v1/quizzes/:id` | MongoDB | Active |
| PUT    | `/api/v1/quizzes/:id` | MongoDB | Active |
| DELETE | `/api/v1/quizzes/:id` | MongoDB | Active |
| GET    | `/api/v1/categories` | MongoDB | Active |
| POST   | `/api/v1/categories` | MongoDB | Active |
| PUT    | `/api/v1/categories/:id` | MongoDB | Active |
| DELETE | `/api/v1/categories/:id` | MongoDB | Active |
| GET    | `/api/v1/question-bank` | **In-memory** | Active (data lost on restart) |
| POST   | `/api/v1/question-bank` | **In-memory** | Active (data lost on restart) |
| PUT    | `/api/v1/question-bank/:id` | **In-memory** | Active (data lost on restart) |
| DELETE | `/api/v1/question-bank/:id` | **In-memory** | Active (data lost on restart) |
| POST   | `/api/v1/live-events` | MongoDB | Active |
| GET    | `/api/v1/live-events/:eventCode` | MongoDB | Active |

### Unregistered (dead code)
- `src/modules/questionBank/` — Full DDD + MongoDB implementation exists but is **not wired** into `app.ts`. Duplicates the in-memory routes above.

---

## Existing Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `event:join` | Client → Server | Participant joins a session room |
| `event:adminJoin` | Client → Server | Admin joins, uploads quiz snapshot to in-memory cache |
| `event:setActiveQuestion` | Client → Server | Admin advances question index (persisted to MongoDB) |
| `event:showQuestion` | Client → Server | Admin toggles question visibility |
| `event:answer` | Client → Server | Participant submits answer (persisted to MongoDB, results broadcast) |

**Limitation:** Quiz question data is cached in a `Map` keyed by `eventCode` — lost on server restart or across multiple instances (Redis adapter handles Socket.IO scaling but not the quiz cache).

---

## Reusable Components / Patterns

| Pattern | Location | Reuse Notes |
|---------|----------|-------------|
| `BaseController` | `src/shared/core/BaseController.ts` | Provides `ok`, `created`, `clientError`, `notFound`, `fail` — use for all dashboard controllers |
| `Result<T>` | `src/shared/core/Result.ts` | Success/failure wrapper — use in all dashboard use cases |
| `UseCase<Req, Res>` | `src/shared/core/UseCase.ts` | Base interface — implement for every dashboard use case |
| `Guard` | `src/shared/core/Guard.ts` | Null/undefined checks — use for input validation |
| Mongoose pattern | `src/modules/quiz/infra/db/` | Reference for MongoDB model + repository structure |
| Prisma client singleton | `src/shared/infra/prisma/prismaClient.ts` | Use for all PostgreSQL queries |

---

## Gaps vs Dashboard Requirements

| Requirement | Gap | Recommendation |
|-------------|-----|----------------|
| Participant scores persisted | Answers stored in MongoDB LiveEvent document, not normalised; no score calculated | `FinaliseAttemptUseCase` + PostgreSQL `Attempt` / `AttemptAnswer` tables added in Sprint 1 |
| Session analytics endpoint | No `/dashboard` routes exist | Implement in Sprint 2 (Setup Dashboard Layout task) |
| Topic-level scoring | Not tracked | `topicTag` field on `Question` model; `ScoringService.score()` computes it |
| RBAC / user identity | No auth middleware; no `User` model | `User` + `UserRole` added to PostgreSQL schema; auth middleware needed in a future sprint |
| Question bank persistence | In-memory only (active routes) | Wire `src/modules/questionBank/` MongoDB implementation into `app.ts` |
| Export (CSV/PDF) | Not implemented | Future sprint |
| Socket CORS for production | Only `localhost:5173` listed in Socket.IO CORS | Add `https://mfquiz-web.fly.dev` to Socket.IO CORS config |

---

## CORS Configuration

```
Express CORS:  localhost:5173  ✓   mfquiz-web.fly.dev  ✓
Socket.IO CORS: localhost:5173  ✓   mfquiz-web.fly.dev  ✗  ← needs fix
```
