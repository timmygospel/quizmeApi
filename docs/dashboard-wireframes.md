# Dashboard Wireframes — Quizme Results Dashboard

Low-fidelity wireframes defining layout and structure for all major dashboard sections.
These guide frontend implementation (Sprint 2+).

---

## Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  QUIZME  [Dashboard]  [Sessions]  [Reports]      [Admin ▾]      │  ← Top Nav
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  Quiz: [Select quiz ▾]   Session: [Select session ▾]  [Export] │  ← Filters Bar
└─────────────────────────────────────────────────────────────────┘
│                                                                   │
│  ┌─── Executive Summary ──────────────────────────────────────┐  │
│  │  [Participants: 42]  [Avg Score: 74%]  [Pass Rate: 68%]    │  │
│  │  [Completion: 95%]   [Duration: 18min]                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─── Score Distribution ─────────┐  ┌─── Topic Breakdown ───┐  │
│  │  Bar chart (0-100% bins)        │  │  Topic      Avg Score │  │
│  │  ████████████▒▒▒░░             │  │  ─────────  ───────── │  │
│  │  0   20   40   60   80  100    │  │  JavaScript   82%     │  │
│  └────────────────────────────────┘  │  Arrays       71%     │  │
│                                       │  Promises     55%     │  │
│                                       └───────────────────────┘  │
│                                                                   │
│  ┌─── Participant Table ─────────────────────────────────────┐   │
│  │  [Search…]                          [Sort ▾]  [Filter ▾]  │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │  Name          Score   Passed  Answered  Completed At     │   │
│  │  Alice Brown   91%     ✓       10/10     14:32            │   │
│  │  Bob Smith     63%     ✗        9/10     14:45            │   │
│  │  Carol Jones   74%     ✓       10/10     14:38            │   │
│  │  …                                                         │   │
│  │  [← Prev]  Page 1 of 3  [Next →]                          │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─── Question Analysis ─────────────────────────────────────┐   │
│  │  Q#  Question (truncated)        Correct%  Avg Time  Diff  │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │   1  What is a closure?           88%       12s       Easy │   │
│  │   2  Explain event loop           45%       28s       Hard │   │
│  │   3  Promise vs callback          72%       18s       Med  │   │
│  └───────────────────────────────────────────────────────────┘   │
```

---

## Section Specs

### Executive Summary

| Metric | Source |
|---|---|
| Total Participants | COUNT(attempts WHERE status=COMPLETED) |
| Average Score | AVG(attempts.totalScore) |
| Pass Rate | COUNT(passed=true) / total * 100 |
| Completion Rate | completed / joined * 100 |

### Score Distribution

- Histogram with 10% bins (0–9, 10–19, … 90–100)
- Colour: green ≥ passingScore, amber within 10%, red below

### Topic Breakdown

- One row per `topicTag` on questions
- Columns: Topic, Participants Answered, Avg Score, Pass Rate
- Sorted by avg score ascending (weakest first) to surface gaps

### Participant Table

- Columns: Name, Score (%), Passed (✓/✗), Questions Answered, Completed At
- Sortable by any column; searchable by name
- Paginated (25 rows/page default)
- Row click → participant detail modal (per-question breakdown)

### Question Analysis

- One row per question ordered by index
- Columns: #, Question text (truncated 80 chars), % Correct, Difficulty badge
- Difficulty derived from % correct: Easy ≥ 75%, Medium 50–74%, Hard < 50%

---

## Navigation & Roles

| Role | Access |
|---|---|
| ADMIN | All sessions, all orgs |
| TRAINER | Sessions they hosted |
| PARTICIPANT | Own attempt only (read-only) |

---

## Responsive Breakpoints

| Breakpoint | Layout change |
|---|---|
| < 768px | Executive summary stacks vertically; table collapses to cards |
| 768–1024px | Topic breakdown moves below score distribution |
| > 1024px | Full two-column layout as shown |
