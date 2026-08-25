
# 🧭 Quiz API — Developer Guide

## Overview

This project is a **Node.js + TypeScript backend** for managing quizzes (create, update, delete, view).
It’s designed using **Domain-Driven Design (DDD)** and **Vertical Slice Architecture**, inspired by **Khalil Stemmler’s “DDD Forum”** project.

Each “slice” (feature) — such as **Quiz** — contains everything it needs: its **domain models**, **use cases**, **controllers**, and **database logic**.
This makes the codebase modular, testable, and easy to extend.

---

## 🎯 Architecture at a Glance

```
HTTP Request
   ↓
Controller (infra/http)
   ↓
Use Case (application/useCases)
   ↓
Domain (business logic)
   ↓
Repository (infra/db)
   ↓
MongoDB
```

- **Controllers** handle HTTP requests and translate them into use case commands.
- **Use Cases** encapsulate specific business actions (CreateQuiz, UpdateQuiz, etc.).
- **Domain** defines core entities (`Quiz`, `Question`, `Option`) and rules.
- **Repositories** abstract persistence (MongoDB in this case).
- **Mappers** translate between **domain entities** and **MongoDB documents**.

---

## 📂 Folder Structure

```
src/
├── app.ts
├── server.ts
│
├── shared/core/
│   ├── BaseController.ts
│   ├── Result.ts
│   ├── Guard.ts
│   └── UseCase.ts
│
└── modules/
    └── quiz/
        ├── domain/
        ├── application/useCases/
        ├── infra/
        └── mappers/
```

---

## ⚙️ How It Works

### 1. Domain Layer

Defines your core business rules with no dependencies on frameworks.

### 2. Application Layer

Implements **use cases** like CreateQuiz, UpdateQuiz, DeleteQuiz, GetQuiz, GetAllQuizzes.

### 3. Infrastructure Layer

Handles external concerns: **HTTP**, **DB**, and **mapping**.

### 4. Mappers

`QuizMap.ts` ensures clean separation between domain, persistence, and DTO layers.

### 5. Controllers and Routes

Controllers use a **BaseController** to simplify request/response handling.

---

## 🧪 Testing the API

Use Insomnia or Postman:

### Create Quiz
`POST /api/v1/quizzes`
```json
{
  "title": "Math Quiz",
  "questions": [
    {
      "question": "2 + 2 = ?",
      "options": [
        { "text": "3", "correct": false },
        { "text": "4", "correct": true }
      ]
    }
  ]
}
```

### Get All Quizzes
`GET /api/v1/quizzes`

### Update Quiz
`PUT /api/v1/quizzes/:id`

### Delete Quiz
`DELETE /api/v1/quizzes/:id`

---

## 🧩 Environment Setup

`.env` (see `.env.example`)
```
PORT=4000
DATABASE_URL=postgres://quizmeapi:quizmeapi@localhost:5432/quizmeapi
NODE_ENV=development
```

Run `npm run db:migrate` after setting `DATABASE_URL` to create/update the Postgres schema.

---

## 🔐 First-Time Setup — Bootstrapping the First Admin

AUTH-002 wired permission checks (`requireAuthenticatedUser` → `requirePermission` →
`applyEffectiveScope`, see `src/shared/infra/http/authorizationMiddleware.ts`) onto
every `/api/v1/users` and `/api/v1/roles` route. That means a fresh database has
no way to create its first user through the API — every user-management endpoint
now requires an already-authenticated caller who already holds the matching
permission.

`npm run bootstrap:admin` breaks that chicken-and-egg loop. It's a standalone
script (`src/shared/infra/postgres/bootstrapAdmin.ts`) that talks to the
repositories directly, never over HTTP — the equivalent of an operator running a
one-off DB seed, not an API request, so it doesn't weaken enforcement on the API
itself.

Run once per environment, after `npm run db:migrate`:

```bash
npm run bootstrap:admin -- --email=you@company.com --firstName=Ada --lastName=Lovelace
```

(or set `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_FIRST_NAME` / `BOOTSTRAP_ADMIN_LAST_NAME`
env vars instead of flags — handy for a deploy hook, e.g. `fly ssh console` in
production.)

This creates a `users` row with status `INVITED` and the **Organisation Admin**
role — org-wide, so unlike every other role it needs no location/department
scope. Nothing gets emailed; sign up through Clerk with the exact same email
address afterwards, and your first authenticated request auto-links the Clerk
identity to this user and flips them to `ACTIVE` (see `authMiddleware.ts`).

The script refuses to run if that email already exists, or if the
`ADMINISTRATOR` role isn't seeded yet (run `npm run db:migrate` first).

---

## 🧱 Key Principles

- **DDD** → Domain first.
- **Vertical Slice** → Each feature is self-contained.
- **Result Pattern** → Unified success/failure handling.
- **BaseController** → Predictable controllers.
- **Mapper Pattern** → Prevents leaking persistence logic.

---

## 🧠 For New Developers

1. Start with `domain/` to understand the business model.
2. Review `useCases/` for behavior logic.
3. Check `controllers/` for HTTP exposure.
4. Test endpoints under `/api/v1/quizzes`.
5. Add new modules following the same structure.

