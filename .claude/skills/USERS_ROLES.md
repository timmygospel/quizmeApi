# Users & Roles — Frontend and API Requirements

## 1. Feature Overview

The **Users & Roles** module allows authorised administrators to manage who can access QuizAnalytics, what responsibilities each person has, and which parts of the organisation they are permitted to access.

The feature supports:

- User management
- Invitations
- User status
- Role assignment
- Permission management
- Department and location scope
- Role-based access control
- Scoped management access
- Audit history

The experience must follow the QuizAnalytics design system and Nielsen usability principles already established throughout the application.

---

# 2. Primary Users

## Organisation Administrator

Primary responsibility:

> Manage users, access and permissions across the organisation.

Can typically:

- Invite users
- Edit users
- Activate or suspend users
- Assign roles
- Assign departments
- Assign locations
- Review permissions
- Review access history

---

## Manager

Managers should **not** manage global roles.

Depending on permissions they may:

- View users within their scope
- View team membership
- View learner training information
- Possibly move users between teams they manage

They must not automatically gain access to organisation-wide user administration.

---

## Content Creator

No user-management responsibilities.

Should not see Users & Roles unless another assigned role grants access.

---

## Executive

Normally read-only.

May be permitted to view:

- Organisation headcount
- Department membership
- Role distribution

Should not edit user permissions.

---

# 3. Navigation

For an administrator, the sidebar should contain:

```text
Dashboard
Training Templates
Sessions
Live Quiz
Assessments
Participants
Departments
Locations
Reports
Content Library
Users & Roles
Settings
```

Selecting **Users & Roles** opens the user-management workspace.

Do not split Users and Roles into unrelated areas of the application.

Use a single module with tabs:

```text
Users | Roles
```

Optional future tabs:

```text
Users | Roles | Invitations | Access Audit
```

---

# 4. Nielsen UX Principles

The Users & Roles feature must specifically follow these principles.

## Visibility of system status

Always show:

- Active / Invited / Suspended / Archived
- Invitation status
- Role assignments
- Last login
- Whether changes have been saved

Never make administrators guess whether an invitation or permission update succeeded.

---

## Match between system and the real world

Use business terminology.

Use:

```text
Manager
Content Creator
Executive
Administrator
Trainer
Participant
```

Do not expose internal values such as:

```text
ROLE_MGR
PERM_USER_READ
scope_type=DEPT
```

---

## User control and freedom

Administrators must be able to:

- Cancel editing
- Resend invitations
- Undo accidental status changes where practical
- Review permissions before saving
- Leave without losing unrelated changes

Destructive actions require clear confirmation.

---

## Consistency and standards

Use the existing QuizAnalytics:

- Application shell
- Sidebar
- Breadcrumb
- Page Header
- Filter Bar
- Data Table
- Form System
- Button hierarchy
- Dialog system

Do not invent a separate admin UI.

---

## Error prevention

Prefer **Suspend** or **Archive** over permanent deletion.

Prevent administrators from:

- Removing their own final Administrator access
- Assigning inaccessible departments
- Assigning invalid role/scope combinations
- Creating duplicate organisation memberships
- Giving roles they themselves are not authorised to grant

---

## Recognition rather than recall

Always display:

- Role names
- Role descriptions
- Scope
- Department/location names

Administrators should not need to remember what a role means.

---

## Minimalist design

Do not display the entire permission matrix on the normal User List screen.

Progressively disclose complexity:

```text
User List
    ↓
User Details
    ↓
Roles & Access
    ↓
Effective Permissions
```

---

# 5. Screen 1 — Users List

## Page Header

```text
Users & Roles

Manage people and access across your organisation.

                                      [Invite User]
```

Exactly one primary action:

**Invite User**

---

## Tabs

```text
Users     Roles
```

`Users` selected by default.

---

## Filter Bar

Recommended filters:

```text
Search users...

Role: All
Department: All
Location: All
Status: All
```

Advanced filters may include:

- Team
- Invitation status
- Last login
- Created date

---

## User Table

Recommended columns:

| Column     | Purpose                    |
| ---------- | -------------------------- |
| Name       | Primary identifier         |
| Email      | Contact/login              |
| Role       | Main assigned role         |
| Department | Organisational context     |
| Location   | Organisational context     |
| Status     | Active, Invited, Suspended |
| Last Login | Security/activity context  |
| Actions    | Context menu               |

Example:

```text
Name            Role        Department     Location      Status      Last Login
Sarah Johnson   Manager     Operations     London        Active      2 hours ago
Mark Thompson   Creator     Learning        Manchester    Active      Yesterday
David Wilson    Participant Warehouse      Birmingham    Suspended   4 Jul 2026
```

---

## Row Actions

Use a `⋮` overflow menu.

```text
View
Edit
Manage access
Resend invitation
Suspend
Archive
```

Do not show six buttons in every row.

---

## User Status Values

Standardise statuses:

```text
INVITED
ACTIVE
SUSPENDED
ARCHIVED
```

Frontend labels:

```text
Invited
Active
Suspended
Archived
```

Avoid a vague status such as `Inactive`.

---

# 6. Invite User Flow

Use a focused form or modal for simple invitations.

Fields:

```text
First name *
Last name *
Email address *
Role *
Department
Location
```

Optional:

```text
Manager
Team
Send welcome email
```

Primary action:

```text
Send Invitation
```

Secondary:

```text
Cancel
```

---

## Invitation Success

Display:

```text
Invitation sent to sarah@example.com.
```

Then show the user in the table with:

```text
Status: Invited
```

---

## Existing User

If the email already belongs to an organisation member:

```text
This user already belongs to the organisation.

View user
```

Do not return a generic duplicate-record error.

---

# 7. User Detail Screen

Selecting a user should open either a dedicated detail page or a wide side drawer.

For QuizAnalytics, a **detail page is preferred** when access configuration is substantial.

Recommended tabs:

```text
Overview
Access
Training
Activity
```

Administrators see all relevant tabs.

Managers may see only authorised tabs.

---

# 8. User Overview

Display:

```text
Sarah Johnson

Active

Manager
```

Information groups:

### Personal Details

- Name
- Email
- Employee reference

### Organisation

- Department
- Location
- Team
- Manager

### Account

- Status
- Joined
- Last login
- Identity provider

### Access Summary

- Assigned roles
- Access scope

---

# 9. Edit User

Follow `PAT-002 Create/Edit Form Page`.

Sections:

```text
Personal details

Organisation

Access

Account status
```

Do not mix everything into one large form.

---

# 10. Roles Tab

The Roles workspace answers:

> What access levels exist, and what can each role do?

Layout:

```text
Users & Roles

Users | Roles

Roles                                         [Create Role]

Administrator
Manager
Content Creator
Executive
Trainer
Participant
```

Each role displays:

- Name
- Description
- User count
- Type
- Last updated

Example:

```text
Manager

Monitors assigned teams and manages their training.

84 users
System role
```

---

# 11. System Roles

Recommended initial roles:

```text
Administrator
Content Creator
Manager
Executive
Trainer
Participant
```

These should ship as predefined system roles.

System roles may be configurable within controlled limits, but should not be deletable.

---

# 12. Custom Roles

Future enterprise customers may need:

```text
Regional Manager
Compliance Manager
Content Reviewer
Training Coordinator
Auditor
```

The platform should therefore support custom organisation roles.

Primary action:

```text
Create Role
```

---

# 13. Role Editor

Do not show a raw list of 100 permission keys.

Group permissions by capability.

Example:

```text
Content

Questions
[✓] View
[✓] Create
[✓] Edit
[ ] Publish
[ ] Archive

Assessments
[✓] View
[✓] Create
[✓] Edit
[ ] Publish
```

Other capability groups:

```text
Users
Training Templates
Sessions
Live Quiz
Participants
Departments
Locations
Analytics
Reports
Settings
Audit
```

---

# 14. Permission Language

Frontend permission labels must use business terms.

API:

```text
question.read
question.create
question.edit
question.publish
```

UI:

```text
Questions

View questions
Create questions
Edit questions
Publish questions
```

Never expose API permission codes to normal users.

---

# 15. Access Scope

Roles alone are insufficient.

QuizAnalytics must support scope.

Example:

```text
Role:
Manager

Scope:
Department

Departments:
Operations
Sales
```

Other supported scopes:

```text
Organisation
Location
Department
Team
```

A manager may therefore have:

```text
Manager — Operations
Manager — Sales
```

without having organisation-wide Manager access.

---

# 16. Effective Permissions

The user detail Access tab should answer:

> What can this person actually access?

Example:

```text
Assigned Roles

Manager
Scope: Operations

Trainer
Scope: London
```

Then optionally:

```text
Effective Access

Participants
View — Operations

Sessions
Create — Operations

Analytics
Team view — Operations
```

This must be read-only.

The frontend should calculate **nothing** here.

The API returns effective permissions.

---

# 17. Permission Conflict UX

If one role provides access and another does not, the backend remains authoritative.

Frontend displays:

```text
Effective permission: Allowed

Granted through:
Manager — Operations
```

Do not ask administrators to mentally resolve permission conflicts.

---

# 18. Suspend User

Use confirmation dialog:

```text
Suspend Sarah Johnson?

Sarah will no longer be able to sign in.
Her historical training results and audit records will remain available.

[Cancel]    [Suspend User]
```

Do not delete historical data.

---

# 19. Archive User

Archive should normally replace permanent deletion.

```text
Archive Sarah Johnson?

The user will be removed from active user lists.
Historical learning and reporting data will be retained.
```

---

# 20. Bulk Actions

User List may support:

```text
Assign role
Change department
Change location
Suspend
Export
```

Avoid bulk deletion.

Bulk actions appear only when rows are selected.

---

# 21. Empty State

```text
No users yet.

Invite your first user to start building your organisation.

[Invite User]
```

---

# 22. Search No Results

```text
No users match your filters.

Clear filters
```

Do not show the same empty state as a genuinely empty organisation.

---

# 23. Loading State

Use skeleton rows.

Do not replace the entire shell with a spinner.

---

# 24. Permission Denied State

```text
You don't have permission to manage users.

Contact an organisation administrator if you need access.
```

Provide navigation back.

---

# 25. Frontend React Requirements

Recommended feature structure:

```text
modules/
  users/
    domain/
    application/
    infrastructure/
    presentation/

  roles/
    domain/
    application/
    infrastructure/
    presentation/
```

Presentation components:

```text
UsersPage
UsersTable
UserFilters
InviteUserDialog
UserDetailsPage
UserOverview
UserAccessPanel
RoleList
RoleEditor
PermissionGroup
AccessScopeSelector
```

---

# 26. Frontend State

Use TanStack Query for server state.

Recommended query keys:

```text
users
user:{id}
roles
role:{id}
permissions
user-effective-access:{id}
departments
locations
teams
```

Do not store users globally in React Context.

---

# 27. Frontend Validation

Use React Hook Form + Zod.

Client-side validation improves UX.

The API remains authoritative.

Example:

```text
Email required
Valid email format
Role required
```

Server checks:

```text
Email already exists
Role may be assigned
Scope is authorised
Department exists
```

---

# 28. Frontend Acceptance Criteria

### User List

**Given** an administrator opens Users & Roles
**When** users load
**Then** the system displays users within the administrator's permitted organisation scope.

### Search

**Given** users exist
**When** the administrator searches by name or email
**Then** matching users are returned.

### Filters

**Given** users have different roles and departments
**When** a role or department filter is applied
**Then** only matching users are displayed.

### Invitation

**Given** a valid email and role
**When** Send Invitation is selected
**Then** the invitation is created and the table shows the user as Invited.

### Access

**Given** a user has multiple scoped roles
**When** the administrator opens Access
**Then** the frontend displays the effective access returned by the API.

### Suspend

**Given** an Active user
**When** suspension is confirmed
**Then** status changes to Suspended without removing historical records.

---

# API REQUIREMENTS

# 29. Users API

Required endpoints:

```text
GET    /users
POST   /users/invitations

GET    /users/{userId}
PATCH  /users/{userId}

POST   /users/{userId}/activate
POST   /users/{userId}/suspend
POST   /users/{userId}/archive

POST   /users/{userId}/resend-invitation

GET    /users/{userId}/effective-access
GET    /users/{userId}/activity
```

---

# 30. User List Endpoint

```text
GET /api/v1/users
```

Query parameters:

```text
search
roleId
departmentId
locationId
teamId
status
page
pageSize
sort
direction
```

Example:

```text
GET /users?departmentId=123&status=ACTIVE&page=1&pageSize=25
```

Response:

```json
{
  "data": [
    {
      "id": "user-uuid",
      "firstName": "Sarah",
      "lastName": "Johnson",
      "displayName": "Sarah Johnson",
      "email": "sarah@example.com",
      "status": "ACTIVE",
      "roles": [
        {
          "id": "role-uuid",
          "name": "Manager"
        }
      ],
      "primaryDepartment": {
        "id": "department-uuid",
        "name": "Operations"
      },
      "primaryLocation": {
        "id": "location-uuid",
        "name": "London"
      },
      "lastLoginAt": "2026-08-11T15:20:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 231
  }
}
```

---

# 31. Invite User

```text
POST /api/v1/users/invitations
```

Request:

```json
{
  "email": "sarah@example.com",
  "firstName": "Sarah",
  "lastName": "Johnson",
  "roles": [
    {
      "roleId": "manager-role-uuid",
      "scopeType": "DEPARTMENT",
      "scopeIds": ["operations-department-uuid"]
    }
  ],
  "departmentId": "operations-department-uuid",
  "locationId": "london-location-uuid",
  "sendInvitation": true
}
```

API responsibilities:

- Validate email.
- Confirm caller may invite users.
- Confirm caller may assign requested roles.
- Validate scope.
- Prevent duplicate organisation membership.
- Create membership.
- Create role assignments.
- Send invitation.
- Record audit event.

---

# 32. Roles API

Required endpoints:

```text
GET    /roles
POST   /roles

GET    /roles/{roleId}
PATCH  /roles/{roleId}

POST   /roles/{roleId}/archive

GET    /permissions
GET    /roles/{roleId}/permissions
PUT    /roles/{roleId}/permissions
```

---

# 33. Role Response

```json
{
  "id": "role-uuid",
  "code": "MANAGER",
  "name": "Manager",
  "description": "Manages training and performance for assigned teams.",
  "type": "SYSTEM",
  "userCount": 84,
  "permissions": [
    "participant.read",
    "assignment.read",
    "assignment.manage",
    "analytics.team.view"
  ]
}
```

---

# 34. Effective Access Endpoint

```text
GET /users/{userId}/effective-access
```

This endpoint is important.

Do not make React derive access from roles.

Example response:

```json
{
  "data": {
    "userId": "user-uuid",
    "roles": [
      {
        "role": {
          "id": "manager-role-uuid",
          "name": "Manager"
        },
        "scope": {
          "type": "DEPARTMENT",
          "entities": [
            {
              "id": "operations-uuid",
              "name": "Operations"
            }
          ]
        }
      }
    ],
    "permissions": [
      {
        "permission": "participant.read",
        "allowed": true,
        "scopeType": "DEPARTMENT",
        "scopeIds": ["operations-uuid"],
        "grantedBy": ["Manager"]
      }
    ]
  }
}
```

---

# 35. Backend Permission Rules

The API must perform checks in this order:

```text
Authenticated?
        ↓
Active organisation membership?
        ↓
Required permission?
        ↓
Correct organisation?
        ↓
Correct scope?
        ↓
Business rule valid?
        ↓
Allow action
```

Frontend hiding is never considered security.

---

# 36. Self-Protection Rules

Prevent an administrator from accidentally locking the organisation out.

The API must reject:

- Archiving the final active Administrator.
- Suspending the final active Administrator.
- Removing the final Administrator role.
- Removing their own Administrator role when they are the final administrator.

Return:

```text
409 Conflict
```

Example message:

```text
This organisation must have at least one active Administrator.
Assign another Administrator before removing this access.
```

---

# 37. Role Assignment Rules

The API must ensure:

- Role exists.
- Role belongs to the organisation or is a system role.
- Scope type is supported.
- Scope entities belong to the organisation.
- Caller may manage that scope.
- Archived entities cannot receive new assignments.
- Duplicate assignments are ignored or rejected consistently.

---

# 38. User Status Transitions

Allowed:

```text
INVITED → ACTIVE

ACTIVE → SUSPENDED

SUSPENDED → ACTIVE

INVITED → ARCHIVED

ACTIVE → ARCHIVED

SUSPENDED → ARCHIVED
```

Do not permit:

```text
ARCHIVED → ACTIVE
```

without an explicit Restore workflow.

---

# 39. Audit Events

Mandatory events:

```text
UserInvited
InvitationResent
UserActivated
UserSuspended
UserArchived

RoleCreated
RoleUpdated
RoleArchived

RoleAssigned
RoleRemoved

UserDepartmentChanged
UserLocationChanged
UserTeamChanged
```

Each record captures:

```text
Actor
Target
Previous Value
New Value
Timestamp
Organisation
Reason where applicable
Correlation ID
```

---

# 40. API Permissions

Initial catalogue:

```text
user.read
user.invite
user.edit
user.suspend
user.archive

role.read
role.create
role.edit
role.archive
role.assign

permission.read

organisation.membership.manage
```

---

# 41. API Acceptance Criteria

### Organisation isolation

**Given** an administrator belongs to Organisation A
**When** they request a user belonging only to Organisation B
**Then** the API must not expose the user.

### Scope

**Given** a Manager is scoped to Operations
**When** they request Sales participants
**Then** access must be denied.

### Role assignment

**Given** an administrator cannot grant Executive access
**When** they attempt to assign Executive
**Then** the API returns `403`.

### Final Administrator

**Given** one active Administrator remains
**When** that account is suspended
**Then** the API returns `409`.

### Historical data

**Given** a user is archived
**When** historical assessments and reports are queried
**Then** their historical records remain available according to the reporting permissions and retention rules.

---

# 42. Definition of Done

The Users & Roles feature is complete when:

- User listing works.
- Search/filtering works.
- User invitations work.
- Resend invitation works.
- Editing works.
- Status management works.
- Role assignment works.
- Scoped access works.
- Effective permissions are available.
- Final-admin protection works.
- Audit events are captured.
- API permissions are enforced.
- UI follows the QuizAnalytics design system.
- Keyboard navigation works.
- WCAG 2.2 AA checks pass.
- Playwright user-management flows pass.

---

# 43. Recommended Implementation Sequence

## Sprint 1 — Read-only Users

```text
GET /users
GET /users/{id}

Users List UI
User Detail UI
Filters
```

## Sprint 2 — Invitations

```text
Invite User
Invitation Status
Resend Invitation
```

## Sprint 3 — Status Management

```text
Activate
Suspend
Archive
```

## Sprint 4 — Roles

```text
GET /roles
Role List
Role Editor
Permissions
```

## Sprint 5 — Scoped Access

```text
Department scope
Location scope
Team scope
Effective access
```

## Sprint 6 — Hardening

```text
Audit
Final-admin protection
Concurrency
Permissions tests
Accessibility
Playwright
```

---

# Final UX Principle

Users & Roles should never feel like a database administration tool.

The administrator's mental model should simply be:

```text
Who is this person?

↓

What responsibility do they have?

↓

Where are they allowed to operate?

↓

What can they do there?
```

The UI should express those four concepts clearly.

The API can remain considerably more sophisticated underneath, but that complexity should not be transferred to the administrator.

# Global Role Scope Rules

## 1. Core Access Rule

QuizAnalytics uses:

```text
Role
+
Organisational Scope
```

for all operational roles.

A role determines **what a user can do**.

Scope determines **where they can do it**.

Example:

```text
Role:
Manager

Scope:
Birmingham → Operations
```

means:

> The user has Manager capabilities only for Birmingham Operations.

---

# 2. Organisation-Wide Roles

Only the following roles receive organisation-wide visibility by default:

## Organisation Administrator

Can manage:

- All users
- All departments
- All locations
- Roles and permissions
- Organisation settings
- All content
- All sessions
- Organisation-wide reporting
- Audit where authorised

## Executive

Can view organisation-wide performance and reporting.

Typical access includes:

- Organisation dashboard
- Department comparison
- Location comparison
- Organisation trends
- Risk reporting
- Executive reports

Executive access is primarily **read-only**.

Executives should not automatically receive:

- Content authoring
- User administration
- Role management
- Configuration permissions

---

# 3. Scoped Roles

The following roles are organisationally scoped:

- Manager
- Content Creator
- Trainer
- Content Reviewer
- Participant / Learner
- Compliance Manager
- Training Coordinator
- Auditor, if not granted organisation-wide audit access
- Any future custom operational role

The API must enforce scope for all of these roles.

---

# 4. Scope Hierarchy

Supported organisational scope:

```text
Organisation
    ↓
Location
    ↓
Department
    ↓
Team
```

A role assignment may target one or more nodes within this structure.

Examples:

```text
Manager
Birmingham
All Departments
```

or:

```text
Manager
Birmingham
Operations
Warehouse
```

or:

```text
Trainer
London
Sales
```

---

# 5. Manager Scope

Manager access is limited to explicitly assigned locations, departments or teams.

Example:

```text
Manager:
Sarah Johnson

Birmingham
    Operations
    Warehouse
```

Sarah may view:

- Users in those areas
- Training assignments in those areas
- Assessment results
- Live-session results
- Team analytics
- Reports and exports

She may not view data outside that scope.

---

# 6. Content Creator Scope

A Content Creator should also be scoped.

Example:

```text
Content Creator:
James Wilson

Location:
London

Department:
Learning & Development
```

The creator may:

- Create content for their authorised scope
- Edit content they own or are authorised to manage
- See relevant Question Bank content
- Manage templates within their scope

They should not automatically gain organisation-wide access to:

- All departments
- Named learner results
- Organisation analytics

Where content is intentionally shared organisation-wide, sharing is a separate permission or publication rule.

---

# 7. Trainer Scope

Trainer access should be limited to:

- Sessions they host
- Locations they are assigned to
- Departments they are permitted to train
- Participants involved in those sessions

Example:

```text
Trainer:
David Wilson

Manchester
    Operations
    Warehouse
```

David may manage training sessions for those areas.

He cannot browse unrelated learner results across the organisation.

---

# 8. Reviewer Scope

Content Reviewers should only review content within their assigned scope.

Example:

```text
Reviewer:
Emma Patel

Scope:
Compliance Content
London + Manchester
```

Possible permissions:

- View submitted content
- Comment
- Request changes
- Approve
- Reject

But only within authorised scope.

---

# 9. Participant / Learner Scope

Participants have the narrowest scope.

They may only access:

- Their own assignments
- Their own attempts
- Their own results
- Their own certificates
- Live sessions they are authorised to join

A participant must never be able to view another participant's data.

---

# 10. Custom Roles

Custom roles must follow the same rule.

Example:

```text
Role:
Compliance Manager

Capabilities:
View compliance reports
Assign compliance training
Export compliance results

Scope:
Birmingham
Manchester
```

Do not create separate role definitions such as:

```text
Birmingham Compliance Manager
Manchester Compliance Manager
```

Keep:

```text
Role = Compliance Manager
```

and apply scope separately.

---

# 11. Main Admin Scope Assignment

Organisation Administrators assign scope through:

```text
Users & Roles
    ↓
Select User
    ↓
Access
```

Recommended UI:

```text
Role
Manager

Access Scope

Location
[✓] Birmingham
[ ] London
[ ] Manchester

Birmingham Departments

○ All departments
● Selected departments

[✓] Operations
[✓] Warehouse
[ ] Finance
[ ] HR
```

This same component should be reused for all scoped roles.

---

# 12. Multiple Role Assignments

A user may have different roles in different scopes.

Example:

```text
Sarah Johnson

Manager
Birmingham → Operations

Trainer
Birmingham → Operations
Birmingham → Warehouse

Content Reviewer
Organisation → Fire Safety Content
```

The system combines these assignments into effective access.

---

# 13. Effective Access

The frontend must never infer effective access itself.

API endpoint:

```text
GET /users/{userId}/effective-access
```

Example:

```json
{
  "data": {
    "roles": [
      {
        "name": "Manager",
        "scope": [
          {
            "location": "Birmingham",
            "departments": ["Operations"]
          }
        ]
      },
      {
        "name": "Trainer",
        "scope": [
          {
            "location": "Birmingham",
            "departments": ["Operations", "Warehouse"]
          }
        ]
      }
    ]
  }
}
```

---

# 14. Frontend Scope Behaviour

The frontend must use the effective scope returned by the API.

A user should never see irrelevant options.

Example:

If a user is scoped to:

```text
Birmingham
    Operations
    Warehouse
```

their filters should show only:

```text
Location
Birmingham

Department
All authorised departments
Operations
Warehouse
```

Do not show:

```text
London
Manchester
Finance
HR
```

This follows Nielsen's error-prevention principle.

---

# 15. Dashboard Behaviour

All dashboards must be scoped by role and access.

## Manager

Team/location scope only.

## Content Creator

Content workspace scope only.

## Trainer

Assigned sessions and training scope only.

## Reviewer

Content-review scope only.

## Executive

Organisation-wide.

## Organisation Administrator

Organisation-wide administrative scope.

---

# 16. Analytics Scope

Every analytics endpoint must automatically apply the authenticated user's maximum authorised scope.

Example:

```text
GET /analytics/overview
```

For a Manager:

```text
Automatically restricted to assigned departments/locations.
```

For an Executive:

```text
Organisation-wide.
```

For a Content Creator:

```text
Only content analytics they are authorised to view.
```

The frontend may narrow the scope.

It must never be able to broaden it.

---

# 17. Participant Results

Named participant results are additionally permission controlled.

Examples:

### Manager

May view participant results inside their authorised scope.

### Trainer

May view results for participants in sessions they are authorised to manage.

### Content Creator

Normally no named participant access.

May receive aggregated question/content analytics.

### Executive

Organisation-wide drill-down only where approved by policy.

### Organisation Administrator

Organisation-wide according to administration permissions.

---

# 18. Reports and Exports

Scope applies equally to:

- Screens
- API endpoints
- CSV exports
- Excel exports
- PDFs
- Scheduled reports

Example:

```text
Manager scope:
Birmingham → Operations
```

An export must contain only:

```text
Birmingham → Operations
```

The export service must independently apply authorisation.

---

# 19. Live Session Scope

A role may only access a live session when:

- It is within their organisational scope, or
- They are explicitly assigned as host/trainer, or
- Another explicit permission grants access.

Example:

A Trainer assigned to Birmingham Warehouse may host or review Warehouse sessions but not London Sales sessions.

---

# 20. Content Scope

Content should support its own visibility rules.

Recommended content visibility values:

```text
PRIVATE
SCOPED
ORGANISATION
```

### PRIVATE

Owner only.

### SCOPED

Specific locations/departments/teams.

### ORGANISATION

Available organisation-wide.

This is important because a creator's own access scope and the audience for published content are related but not necessarily identical.

---

# 21. API Authorisation Pipeline

Every scoped request should follow:

```text
Authenticated?
        ↓
Active organisation membership?
        ↓
Required capability?
        ↓
Role allows action?
        ↓
Entity belongs to organisation?
        ↓
Entity falls within authorised scope?
        ↓
Specific business rule allows action?
        ↓
ALLOW
```

Otherwise deny.

---

# 22. Global Scope Matrix

| Role                     | Default scope                             |
| ------------------------ | ----------------------------------------- |
| Organisation Admin       | Organisation-wide                         |
| Executive                | Organisation-wide read/reporting          |
| Manager                  | Assigned location / department / team     |
| Content Creator          | Assigned content/org scope                |
| Trainer                  | Assigned location / department / sessions |
| Reviewer                 | Assigned content/scope                    |
| Participant              | Self only                                 |
| Custom operational roles | Explicit assigned scope                   |

---

# 23. Nielsen UX Requirements

## Recognition over recall

Show:

```text
Manager
Birmingham
Operations
Warehouse
```

rather than technical scope configuration.

## Error prevention

Do not show locations, departments or actions outside the user's effective access.

## Visibility of system status

Always show the active scope where it matters.

Example:

```text
Viewing:
Birmingham → Operations + Warehouse
```

## Consistency

Use the same scope selector and access-summary component for every role.

## Minimalist design

Do not make users interact with low-level permission codes during normal access assignment.

---

# 24. Mandatory Security Rule

The following should be written into the product's Business Rules section:

> **All QuizAnalytics roles are organisationally scoped unless explicitly defined as organisation-wide. Organisation Administrator and Executive are organisation-wide by default. All other roles may only access entities, users, results, analytics and actions within their effective assigned scope. The API is the authoritative enforcement point.**

---

# 25. Critical API Tests

Every scoped role must pass the same security test suite.

For each role test:

```text
Can access:
own scope

Cannot access:
adjacent department

Cannot access:
different location

Cannot access:
different organisation

Cannot widen scope through query parameters

Cannot access resource directly by known UUID

Cannot export unauthorised data
```

This should become a reusable authorisation integration-test suite rather than manually reimplementing security tests for every endpoint.

Organisation structure is flexible. Locations, departments and teams are optional organisational levels. Users and role scopes may be assigned at the lowest level that exists for that customer. The absence of teams must never prevent department-level assignment or reporting.
