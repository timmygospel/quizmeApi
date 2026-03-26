# CLAUDE.md

# Project scope
This session is for one project only:

**Project Name:** Quizme Dashboard upgrades

Work only in this repository and only on tasks for this project from Notion.

# Notion sprint workflow
Notion is the source of truth for planning and task status.

## Rules
- Read tasks from the Notion sprint board
- Only work on tasks where:
  - Project = "Quizme Dashboard upgrades"
  - Status = "Backlog"
- There are 5 sprints total
- Prioritize the earliest active sprint first unless a higher-priority task is clearly marked
- Before starting work on a task, update its status from `Backlog` to `In Progress`
- After finishing implementation, run relevant checks
- If work is complete and checks pass, update status to `Done`
- If blocked, update status to `Blocked` and add a short explanation
- If partially complete, update status to `In Review` and leave a summary
- Always add a short summary to Notion describing:
  - what changed
  - files touched
  - test results
  - any follow-up work

# Engineering rules
- Stay within this repository only
- Do not make unrelated refactors
- Prefer small, safe changes
- Read existing patterns before editing
- Run lint/tests/build checks relevant to the change
- If a migration or risky change is needed, explain it before proceeding
- Do not mark a task Done unless the code changes are implemented and verified

# Task selection policy
When choosing what to work on:
1. Filter to Project = "Quizme Dashboard upgrades"
2. Filter to Status = "Backlog"
3. Prefer Sprint 1, then Sprint 2, then Sprint 3, then Sprint 4, then Sprint 5
4. Within a sprint, choose the highest-priority task
5. If no priority exists, choose the clearest self-contained task

# Required workflow for each task
1. Find the next Backlog task for "Quizme Dashboard upgrades"
2. Summarize the task briefly
3. Update Notion status to `In Progress`
4. Implement the change in this repo
5. Run relevant validation (tests/lint/build)
6. Update Notion with a concise completion note
7. Set final status:
   - `Done` if complete and validated
   - `In Review` if awaiting review
   - `Blocked` if unable to proceed

# Output expectations
Always report:
- selected task
- plan
- code changes made
- validation results
- final Notion status update