
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

`.env`
```
PORT=4000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
NODE_ENV=development
```

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

