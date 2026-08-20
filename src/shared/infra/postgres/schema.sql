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
    ('ADMINISTRATOR', 'Administrator', 'Manages users, access and permissions across the organisation.', 'SYSTEM'),
    ('MANAGER', 'Manager', 'Monitors assigned teams and manages their training.', 'SYSTEM'),
    ('CONTENT_CREATOR', 'Content Creator', 'Creates and edits training content within an assigned scope.', 'SYSTEM'),
    ('EXECUTIVE', 'Executive', 'Read-only view of organisation-wide performance and reporting.', 'SYSTEM'),
    ('TRAINER', 'Trainer', 'Hosts and manages training sessions within an assigned scope.', 'SYSTEM'),
    ('PARTICIPANT', 'Participant', 'Completes assigned training and views their own results.', 'SYSTEM')
ON CONFLICT (code) DO NOTHING;

-- Sprint 4 — Roles: mutation, archive, and the permission catalogue per
-- USERS_ROLES.md §32-33/§40. The catalogue below is the doc's explicit
-- "Initial catalogue" (§40); the finer-grained content permissions used as
-- illustrative UI copy elsewhere in the doc (question.read, etc.) aren't
-- wired to real enforcement anywhere yet, so they're left for when those
-- modules actually need gating.
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
    ('role.archive', 'Archive roles', 'Archive a custom role.', 'Roles'),
    ('role.assign', 'Assign roles', 'Assign roles to users.', 'Roles'),
    ('permission.read', 'View permissions', 'View the organisation''s permission catalogue.', 'Roles'),
    ('organisation.membership.manage', 'Manage organisation membership', 'Manage who belongs to the organisation.', 'Organisation')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_code)
);

-- Starter grants for the seeded system roles. Approximate — USERS_ROLES.md
-- describes each role's responsibilities in prose (§2 Administrator can
-- manage users/roles/permissions; §67-77 Executive is read-only; §44-55
-- Manager should not manage global roles) but never gives an exact
-- permission-to-role mapping, so this is a reasonable starting grant rather
-- than a value taken directly from the doc.
INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.code FROM roles r, permissions p WHERE r.code = 'ADMINISTRATOR'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, code FROM roles r, unnest(ARRAY['user.read', 'role.read', 'permission.read']) AS code
WHERE r.code = 'EXECUTIVE'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, 'user.read' FROM roles r WHERE r.code = 'MANAGER'
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
