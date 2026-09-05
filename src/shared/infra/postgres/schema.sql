-- Postgres schema for quizmeApi. Single datastore — MongoDB has been retired;
-- quiz/category/questionBank/liveEvents live here alongside departments/
-- locations/hosts/sessions. Applied in full on every `npm run db:migrate`
-- run, so every statement must be safe to re-run (IF NOT EXISTS / idempotent).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Quiz (training template) content
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    UNIQUE (quiz_id, display_order)
);

CREATE TABLE IF NOT EXISTS quiz_question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL,
    UNIQUE (question_id, display_order)
);

CREATE TABLE IF NOT EXISTS quiz_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    UNIQUE (quiz_id, display_order)
);

-- A section groups a subset of its quiz's own questions (Quiz.QuizSection in
-- the domain layer). No display_order of its own — question order within a
-- section follows quiz_questions.display_order.
CREATE TABLE IF NOT EXISTS quiz_section_questions (
    section_id UUID NOT NULL REFERENCES quiz_sections(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    PRIMARY KEY (section_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Question bank (standalone reusable questions, optionally categorised)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS question_bank_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_bank_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES question_bank_questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL,
    UNIQUE (question_id, display_order)
);

-- ---------------------------------------------------------------------------
-- Sessions — the operational delivery of a quiz (training template).
-- department_ids/location_ids/section_ids stay plain id arrays rather than
-- join tables — sessions never edit their audience/content after creation-time
-- validation, so referential integrity there is enforced at the application layer.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES quizzes(id),
    name TEXT NOT NULL,
    department_ids TEXT[] NOT NULL DEFAULT '{}',
    location_ids TEXT[] NOT NULL DEFAULT '{}',
    all_locations BOOLEAN NOT NULL DEFAULT false,
    section_ids TEXT[] NOT NULL DEFAULT '{}',
    host TEXT NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('assessment', 'live-quiz')),
    pass_threshold INTEGER NOT NULL DEFAULT 0,
    allow_multiple_attempts BOOLEAN NOT NULL DEFAULT false,
    additional_notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Live events — real-time Socket.IO quiz sessions (join code, host-paced).
-- Redis remains the ephemeral realtime layer (per-question counters, answer
-- dedup while a question is active); these tables are the durable record.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS live_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    quiz_id UUID NOT NULL REFERENCES quizzes(id),
    session_id UUID REFERENCES sessions(id),
    status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
    active_question_index INTEGER NOT NULL DEFAULT 0,
    question_visible BOOLEAN NOT NULL DEFAULT false,
    admin_token TEXT NOT NULL,
    passing_score INTEGER NOT NULL DEFAULT 50 CHECK (passing_score BETWEEN 0 AND 100),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable snapshot of the quiz content at the moment the event went live,
-- so later edits/deletes to the source quiz never change historical analytics.
-- quiz_question_id is kept (nullable) purely as a join key back to the source
-- question — e.g. so session_response can attribute a live-quiz answer to a
-- quiz_section for the Analytics module — the text/options snapshot above
-- remains the source of truth for this event's own historical display.
CREATE TABLE IF NOT EXISTS live_event_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_event_id UUID NOT NULL REFERENCES live_events(id) ON DELETE CASCADE,
    quiz_question_id UUID REFERENCES quiz_questions(id) ON DELETE SET NULL,
    question_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- [{ "text": string, "correct": boolean }, ...]
    UNIQUE (live_event_id, question_index)
);

CREATE TABLE IF NOT EXISTS live_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_event_id UUID NOT NULL REFERENCES live_events(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL, -- client-facing id minted by the socket layer
    name TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (live_event_id, participant_id)
);

CREATE TABLE IF NOT EXISTS live_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_event_id UUID NOT NULL REFERENCES live_events(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    option_index INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (live_event_id, participant_id, question_index),
    FOREIGN KEY (live_event_id, participant_id)
        REFERENCES live_participants(live_event_id, participant_id)
);

-- ---------------------------------------------------------------------------
-- Session analytics — generic attempt/response model shared by both session
-- types. Populated today from completed live-quiz events (see the
-- POST /live-events/:eventCode/end handler); ready for a future assessment
-- attempt-taking flow to populate it the same way. Zero rows for a session
-- is a valid, expected state — the analytics module reports honest zero/empty
-- values for it, never a fabricated number or an error.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS session_participant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id),
    display_name TEXT,
    department_id UUID REFERENCES departments(id),
    location_id UUID REFERENCES locations(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_attempt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id),
    session_participant_id UUID NOT NULL REFERENCES session_participant(id),
    score_percentage NUMERIC(5, 2),
    passed BOOLEAN,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS session_response (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_attempt_id UUID NOT NULL REFERENCES session_attempt(id) ON DELETE CASCADE,
    quiz_question_id UUID NOT NULL REFERENCES quiz_questions(id),
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Users & Roles — Sprint 1 (read-only) per USERS_ROLES.md. Role assignments
-- are global for now (role only, no location/department/team scope) — scoped
-- assignment lands in a later sprint per the doc's "Global Role Scope Rules".
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'SYSTEM' CHECK (type IN ('SYSTEM', 'CUSTOM')),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sprint 1/3 shipped without this column; ALTER (rather than relying on the
-- CREATE TABLE IF NOT EXISTS above) so it reaches databases that already
-- migrated the table.
ALTER TABLE roles ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

INSERT INTO roles (code, name, description, type) VALUES
    ('ADMINISTRATOR', 'Organisation Admin', 'Manages users, access and permissions across the organisation.', 'SYSTEM'),
    ('MANAGER', 'Manager', 'Monitors assigned teams and manages their training.', 'SYSTEM'),
    ('CONTENT_CREATOR', 'Content Creator', 'Creates and edits training content within an assigned scope.', 'SYSTEM'),
    ('EXECUTIVE', 'Executive', 'Read-only view of organisation-wide performance and reporting.', 'SYSTEM'),
    ('TRAINER', 'Trainer', 'Hosts and manages training sessions within an assigned scope.', 'SYSTEM'),
    ('PARTICIPANT', 'Participant', 'Completes assigned training and views their own results.', 'SYSTEM')
ON CONFLICT (code) DO NOTHING;

-- PERMISSIONS.md (AUTH-002) §1 renamed this role's display name from the
-- earlier USERS_ROLES.md-era "Administrator" to "Organisation Admin"; the
-- ON CONFLICT DO NOTHING above only applies on first insert, so re-assert it
-- for databases that already migrated under the old name. Code (the FK
-- target everywhere else in the codebase) is intentionally left unchanged.
UPDATE roles SET name = 'Organisation Admin' WHERE code = 'ADMINISTRATOR';

-- Roles: mutation, archive, and the permission catalogue. Codes/categories
-- below are the exact "API Permission Codes" catalogue from PERMISSIONS.md
-- (AUTH-002) §10 — not all of them are wired to real enforcement yet (only
-- user.* and role.* gate any route so far), the rest are seeded ahead of the
-- modules that will need them (question/assessment/template/session/etc.)
-- so the catalogue and role grants can be extended without another schema
-- change.
CREATE TABLE IF NOT EXISTS permissions (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL
);

INSERT INTO permissions (code, name, description, category) VALUES
    ('user.read', 'View users', 'View user profiles and their role assignments.', 'Users'),
    ('user.invite', 'Invite users', 'Invite new users to the organisation.', 'Users'),
    ('user.edit', 'Edit users', 'Edit user details and organisational assignment.', 'Users'),
    ('user.suspend', 'Suspend users', 'Suspend an active user''s access.', 'Users'),
    ('user.archive', 'Archive users', 'Archive a user and remove them from active lists.', 'Users'),
    ('role.read', 'View roles', 'View roles and their permissions.', 'Roles'),
    ('role.create', 'Create roles', 'Create new custom roles.', 'Roles'),
    ('role.edit', 'Edit roles', 'Edit a role''s details and permissions.', 'Roles'),
    ('role.assign', 'Assign roles', 'Assign roles to users.', 'Roles'),
    ('role.archive', 'Archive roles', 'Archive a custom role.', 'Roles'),
    ('question.read', 'View questions', 'View questions.', 'Questions'),
    ('question.create', 'Create questions', 'Create new questions.', 'Questions'),
    ('question.edit', 'Edit questions', 'Edit existing questions.', 'Questions'),
    ('question.review', 'Review questions', 'Review questions submitted for approval.', 'Questions'),
    ('question.publish', 'Publish questions', 'Publish a question for use.', 'Questions'),
    ('question.archive', 'Archive questions', 'Archive a question.', 'Questions'),
    ('assessment.read', 'View assessments', 'View assessments.', 'Assessments'),
    ('assessment.create', 'Create assessments', 'Create new assessments.', 'Assessments'),
    ('assessment.edit', 'Edit assessments', 'Edit existing assessments.', 'Assessments'),
    ('assessment.publish', 'Publish assessments', 'Publish an assessment for use.', 'Assessments'),
    ('assessment.archive', 'Archive assessments', 'Archive an assessment.', 'Assessments'),
    ('template.read', 'View training templates', 'View training templates.', 'Templates'),
    ('template.create', 'Create training templates', 'Create new training templates.', 'Templates'),
    ('template.edit', 'Edit training templates', 'Edit existing training templates.', 'Templates'),
    ('template.publish', 'Publish training templates', 'Publish a training template for use.', 'Templates'),
    ('template.archive', 'Archive training templates', 'Archive a training template.', 'Templates'),
    ('assignment.read', 'View assignments', 'View training assignments.', 'Assignments'),
    ('assignment.create', 'Create assignments', 'Assign training to users.', 'Assignments'),
    ('assignment.manage', 'Manage assignments', 'Manage existing training assignments.', 'Assignments'),
    ('session.read', 'View sessions', 'View training sessions.', 'Sessions'),
    ('session.create', 'Create sessions', 'Schedule new training sessions.', 'Sessions'),
    ('session.manage', 'Manage sessions', 'Manage existing training sessions.', 'Sessions'),
    ('session.host', 'Host sessions', 'Host a live training session.', 'Sessions'),
    ('participant.read', 'View participants', 'View participants within scope.', 'Participants'),
    ('analytics.team.view', 'View team analytics', 'View analytics for a team/scope.', 'Analytics'),
    ('analytics.content.view', 'View content analytics', 'View analytics for training content.', 'Analytics'),
    ('analytics.organisation.view', 'View organisation analytics', 'View organisation-wide analytics.', 'Analytics'),
    ('analytics.export', 'Export analytics reports', 'Export analytics reports.', 'Analytics'),
    ('settings.read', 'View organisation settings', 'View organisation configuration.', 'Settings'),
    ('settings.manage', 'Manage organisation settings', 'Manage organisation configuration.', 'Settings'),
    ('audit.view', 'View audit log', 'View the organisation''s audit log.', 'Audit')
ON CONFLICT (code) DO NOTHING;

-- permission.read / organisation.membership.manage were a pre-AUTH-002
-- invention not present in PERMISSIONS.md §10's catalogue — drop them (and,
-- via the FK cascade, any grants referencing them) so the catalogue matches
-- the spec exactly. No application code reads these codes.
DELETE FROM permissions WHERE code IN ('permission.read', 'organisation.membership.manage');

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_code)
);

-- Starter grants for the seeded system roles, following PERMISSIONS.md §2's
-- Core Permission Matrix at the coarse (unscoped) permission-code level —
-- the matrix's scope qualifiers ("within scope", "own") are enforced by
-- applyEffectiveScope/business-rule checks, not by which codes a role holds.
INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM roles r, permissions p WHERE r.code = 'ADMINISTRATOR'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, perm_code FROM roles r, unnest(ARRAY[
    'user.read', 'role.read', 'settings.read',
    'analytics.team.view', 'analytics.content.view', 'analytics.organisation.view', 'analytics.export',
    'audit.view'
]) AS perm_code
WHERE r.code = 'EXECUTIVE'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, perm_code FROM roles r, unnest(ARRAY[
    'user.read', 'settings.read',
    'assignment.read', 'assignment.create', 'assignment.manage',
    'session.read', 'session.create', 'session.manage',
    'participant.read',
    'analytics.team.view'
]) AS perm_code
WHERE r.code = 'MANAGER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, perm_code FROM roles r, unnest(ARRAY[
    'question.read', 'question.create', 'question.edit', 'question.archive',
    'assessment.read', 'assessment.create', 'assessment.edit', 'assessment.archive',
    'template.read', 'template.create', 'template.edit', 'template.archive',
    'analytics.content.view'
]) AS perm_code
WHERE r.code = 'CONTENT_CREATOR'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, perm_code FROM roles r, unnest(ARRAY[
    'session.read', 'session.host',
    'participant.read',
    'analytics.team.view'
]) AS perm_code
WHERE r.code = 'TRAINER'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    invitation_sent_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sprint 1 shipped without this column; ALTER (rather than relying on the
-- CREATE TABLE IF NOT EXISTS above) so it reaches databases that already
-- migrated the table.
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    all_locations BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

-- Sprint 1 shipped without this column; ALTER (rather than relying on the
-- CREATE TABLE IF NOT EXISTS above) so it reaches databases that already
-- migrated the table.
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS all_locations BOOLEAN NOT NULL DEFAULT false;

-- Sprint 5 — Scoped Access. A role assignment's scope is either "all
-- locations" (user_roles.all_locations) or a set of specific
-- locations/departments below. Team scope is intentionally not modelled —
-- this codebase has no team entity anywhere, and USERS_ROLES.md's own
-- closing rule says the absence of teams must never block department-level
-- assignment. Administrator and Executive are always organisation-wide
-- (§2) regardless of any rows here — see roles/domain/orgWideRoles.ts;
-- assigning either of them with a non-empty scope is rejected at the use
-- case level.
CREATE TABLE IF NOT EXISTS user_role_locations (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id, location_id),
    FOREIGN KEY (user_id, role_id) REFERENCES user_roles(user_id, role_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_role_departments (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id, department_id),
    FOREIGN KEY (user_id, role_id) REFERENCES user_roles(user_id, role_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Auth provider identity — AUTH-001 Pluggable Authentication Architecture.
-- Links a users row to the external identity that authenticates as them
-- (Clerk today; Cognito/Auth0/Entra later). Nullable/unlinked until the
-- person's first successful sign-in, at which point the auth middleware
-- links by matching the provider's verified email against users.email
-- (set at invite time) and never trusts a self-reported id up front.
-- ---------------------------------------------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_user_id TEXT;

-- ---------------------------------------------------------------------------
-- Assessments — formal pass/fail rules layered on top of reusable question
-- content (ASSESSMENTS.md §1: a Quiz answers "what questions", an Assessment
-- answers "what determines a pass"). Placed after categories/users, which it
-- references.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    -- Slice-1 stopgap column — superseded by a derived COUNT() over
    -- assessment_questions (see PgAssessmentRepository's LIST_SELECT) now
    -- that table exists. Left in place rather than dropped; no longer written.
    question_count INTEGER NOT NULL DEFAULT 0,
    pass_mark INTEGER NOT NULL CHECK (pass_mark BETWEEN 0 AND 100),
    max_attempts INTEGER CHECK (max_attempts IS NULL OR max_attempts > 0),
    duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment's own copy of reused Question Bank content (ASSESSMENTS.md
-- §14/§33: content is copied at add-time and frozen, not live-referenced,
-- so a later edit to the bank question never silently changes a published
-- assessment or a learner's completed attempt). Mirrors quiz_questions/
-- quiz_question_options exactly — no FK to question_bank_questions.
CREATE TABLE IF NOT EXISTS assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    UNIQUE (assessment_id, display_order)
);

CREATE TABLE IF NOT EXISTS assessment_question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL,
    UNIQUE (question_id, display_order)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_provider_identity_idx
    ON users (auth_provider, auth_provider_user_id)
    WHERE auth_provider IS NOT NULL AND auth_provider_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Test Sessions (SESSION-BE-002) — timed delivery of one immutable published
-- Assessment to an organisational audience (location/department/optional
-- team), resolved at creation time into explicit participant assignments.
-- Deliberately independent of the quiz-based `sessions`/`session_participant`/
-- `session_attempt`/`session_response` tables above, which remain the
-- liveEvents/analytics stack for quiz-template delivery — a Test Session
-- delivers an Assessment, not a Quiz, and is a distinct bounded context.
-- assessment_id doubles as "assessment_version_id": a PUBLISHED assessments
-- row (and its assessment_questions/options) is immutable — see
-- UpdateAssessmentUseCase's ASSESSMENT_PUBLISHED_IMMUTABLE rule — so no
-- separate assessment_versions table is needed.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id),
    available_from TIMESTAMPTZ NOT NULL,
    available_until TIMESTAMPTZ NOT NULL,
    time_limit_minutes INTEGER NOT NULL CHECK (time_limit_minutes > 0),
    max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts > 0),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A Test Session may have one or more audience rules (e.g. Birmingham+Sales,
-- Manchester+Sales). team_id is a bare nullable id with no FK — this
-- codebase has no `teams` table anywhere (see the user_role_locations/
-- user_role_departments comment above), and the spec only requires team to
-- be optional, not a first-class managed entity.
CREATE TABLE IF NOT EXISTS test_session_audiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    team_id UUID
);

-- Audience resolved into explicit participants at creation time (never
-- recomputed dynamically at reporting time), with the participant's
-- organisational assignment snapshotted for historic reporting — if they
-- later move department/location, this row keeps reporting under where they
-- were assigned for this Test Session.
CREATE TABLE IF NOT EXISTS test_session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    location_id UUID REFERENCES locations(id),
    location_name_snapshot TEXT,
    department_id UUID REFERENCES departments(id),
    department_name_snapshot TEXT,
    team_id UUID,
    team_name_snapshot TEXT,
    status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'TIMED_OUT', 'EXPIRED')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    UNIQUE (test_session_id, user_id)
);

-- expires_at = min(started_at + time_limit, session.available_until) — see
-- attemptExpiry.ts. Server-authoritative: every response/submit endpoint
-- checks this, never the frontend's own timer.
CREATE TABLE IF NOT EXISTS test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    test_session_participant_id UUID NOT NULL REFERENCES test_session_participants(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'TIMED_OUT')),
    score_percentage NUMERIC(5, 2),
    passed BOOLEAN,
    UNIQUE (test_session_participant_id, attempt_number)
);

-- One row per answered question — the UNIQUE constraint is the idempotent
-- upsert target for PUT .../questions/:questionId/response (changing an
-- answer updates this row rather than creating a duplicate). A question with
-- no row here is simply unanswered, which scoreAttempt.ts treats as incorrect.
CREATE TABLE IF NOT EXISTS test_attempt_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    assessment_question_id UUID NOT NULL REFERENCES assessment_questions(id),
    selected_option_id UUID REFERENCES assessment_question_options(id),
    is_correct BOOLEAN,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (test_attempt_id, assessment_question_id)
);

-- ---------------------------------------------------------------------------
-- Audit log (SESSION-BE-002) — minimal insert-only trail shared across
-- modules. No read API yet (none was requested); audit.view is already
-- seeded in the permission catalogue above for a future admin screen to
-- query this table directly.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
