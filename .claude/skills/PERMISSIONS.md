AUTH-002 — Roles, Permissions & Scope

After Clerk successfully authenticates a user, the application flow should be:

Clerk login
↓
Verified Clerk identity
↓
Find QuizAnalytics internal user
↓
Resolve organisation membership
↓
Resolve role(s)
↓
Resolve permissions
↓
Resolve organisational scope
↓
GET /api/v1/me
↓
Frontend builds the correct workspace/navigation

Clerk should answer only:

Who is this user?

QuizAnalytics answers:

What can this user do, and where can they do it?

1. Standard QuizAnalytics Roles

For the initial product I recommend these six standard roles:

Role Primary responsibility Default scope
Organisation Admin Manage organisation, users, access and configuration Organisation-wide
Executive View organisation performance and risk Organisation-wide, primarily read-only
Manager Manage people and training performance Assigned locations/departments/optional teams
Content Creator Create and maintain training content Assigned content/organisation scope
Trainer Deliver and manage training sessions Assigned locations/departments/sessions
Participant Complete assigned learning Self only

A future Content Reviewer, Compliance Manager, Auditor, etc. can be implemented as custom/scoped roles without changing the model.

2. Core Permission Matrix

This is the business-level matrix I would give both frontend and API developers.

Capability Org Admin Executive Manager Content Creator Trainer Participant
View own profile ✅ ✅ ✅ ✅ ✅ ✅
Manage organisation settings ✅ ❌ ❌ ❌ ❌ ❌
Manage users ✅ ❌ Scoped / limited ❌ ❌ ❌
Assign roles ✅ ❌ ❌ ❌ ❌ ❌
Assign location/department scope ✅ ❌ ❌ ❌ ❌ ❌
View organisation-wide users ✅ Read-only if required ❌ ❌ ❌ ❌
View scoped participants ✅ Optional drill-down ✅ ❌ ✅ for sessions/scope Self
Create questions ✅ ❌ ❌ ✅ Optional ❌
Edit questions ✅ ❌ ❌ ✅ Optional ❌
Publish questions ✅ ❌ ❌ ✅ if granted ❌ ❌
Manage Question Bank ✅ ❌ ❌ ✅ Optional read ❌
Create assessments ✅ ❌ ❌ ✅ Optional ❌
Edit assessments ✅ ❌ ❌ ✅ Optional ❌
Publish assessments ✅ ❌ ❌ ✅ if granted ❌ ❌
Create training templates ✅ ❌ ❌ ✅ ❌ ❌
Edit training templates ✅ ❌ ❌ ✅ ❌ ❌
Publish training templates ✅ ❌ ❌ ✅ if granted ❌ ❌
Assign training ✅ ❌ ✅ within scope ❌ Optional within scope ❌
Schedule sessions ✅ ❌ ✅ within scope ❌ ✅ within scope ❌
Host live sessions ✅ ❌ Optional ❌ ✅ ❌
Join live session Optional Optional Optional Optional ✅ host ✅
Complete assessment Optional Optional Optional Optional Optional ✅
View own results ✅ ✅ own ✅ own ✅ own ✅ own ✅
View named learner results ✅ Policy controlled ✅ within scope ❌ ✅ session/scope only Self
View team analytics ✅ ✅ ✅ within scope ❌ Limited ❌
View content analytics ✅ ✅ aggregated ✅ aggregated ✅ Limited ❌
View organisation analytics ✅ ✅ ❌ ❌ ❌ ❌
Compare departments ✅ ✅ Only authorised departments ❌ ❌ ❌
Compare locations ✅ ✅ Only authorised locations ❌ ❌ ❌
Export organisation reports ✅ ✅ ❌ ❌ ❌ ❌
Export scoped reports ✅ ✅ ✅ within scope Content only Session only ❌
View audit log ✅ Read-only if granted ❌ ❌ ❌ ❌ 3. Scope Rules

This is essential.

Organisation Admin and Executive are the only organisation-wide roles by default.

Every other role must operate within its assigned scope.

Organisation
↓
Location (optional)
↓
Department (optional)
↓
Team (optional)

Teams remain optional, as we agreed.

Example:

Sarah Johnson

Role:
Manager

Scope:

Birmingham
├── Operations
└── Warehouse

Sarah can therefore see:

Birmingham → Operations
Birmingham → Warehouse

She cannot see:

Birmingham → Finance
London
Manchester

The same concept applies to Trainer, Content Creator and future custom operational roles.

4. Organisation Admin

Organisation Admin is the administrative super-role inside one organisation.

It should have access to:

Users
Roles
Permissions
Locations
Departments
Teams
Organisation Settings

Questions
Assessments
Templates
Sessions

Analytics
Reports
Audit

However, this should still be implemented through permissions rather than:

if role === "ADMIN" bypassEverything()

Conceptually:

Organisation Admin

scope = organisation

permissions =
all organisation administration capabilities

This keeps the model extensible.

5. Executive

Executive is also organisation-wide, but not an administrator.

The mental model is:

Organisation Admin
"What can I manage?"

Executive
"How is the organisation performing?"

Executive should see:

Dashboard
Reports
Sessions / Training overview
Users (possibly authorised drill-down)
Departments
Locations

Executive should not see:

Question Editor
Assessment Builder
Role Editor
Organisation Settings
User administration actions

This strongly follows Nielsen's minimalist-design principle: do not clutter the executive experience with tools irrelevant to executive decisions.

6. Manager

Manager owns people and performance, not content.

Example navigation:

Workspace

Participants
Training
Sessions
Reports

Do not show:

Question Bank
Create Question
Assessment Builder
Roles
Organisation Settings

unless another assigned role explicitly grants those capabilities.

The Manager's results and analytics must always be constrained by their scope.

7. Content Creator

Content Creator owns content, not employees.

Recommended navigation:

Workspace

Training Templates
Assessments
Questions
Question Bank
Content Reports

Do not show:

Users
Organisation performance
Named learner results
Department comparison
Organisation reports

unless another role grants them.

This follows the role-based homepage philosophy you already established.

8. Trainer

Trainer owns the delivery experience.

Recommended navigation:

My Sessions
Schedule / Sessions
Live Quiz
Participants for authorised sessions
Session Results

Trainer access should normally be restricted to:

assigned locations

- assigned departments
- sessions they host

They should not automatically gain broad learner analytics.

9. Participant

Participant is effectively:

scope = SELF

They may access:

My Training
My Assessments
My Sessions
My Results
My Certificates
My Profile

They must never be able to obtain another participant's data by changing an API ID.

10. API Permission Codes

Keep the codes small and business-oriented.

Your current Users & Roles catalogue remains authoritative until further modules receive real authorization.

As authorization is implemented, I recommend expanding using this convention:

user.read
user.invite
user.edit
user.suspend
user.archive

role.read
role.create
role.edit
role.assign
role.archive

question.read
question.create
question.edit
question.review
question.publish
question.archive

assessment.read
assessment.create
assessment.edit
assessment.publish
assessment.archive

template.read
template.create
template.edit
template.publish
template.archive

assignment.read
assignment.create
assignment.manage

session.read
session.create
session.manage
session.host

participant.read

analytics.team.view
analytics.content.view
analytics.organisation.view
analytics.export

settings.read
settings.manage

audit.view

Do not create:

user.read.birmingham
user.read.operations

Scope remains separate.

11. Backend Authorisation Pipeline

This is the piece I'd make mandatory for the API developer.

Every protected request passes through:

Clerk authentication
↓
QuizAnalytics user mapping
↓
Organisation membership
↓
Permission check
↓
Effective scope check
↓
Business-rule check
↓
Controller/use case

Conceptually:

router.get(
"/participants",
requireAuthenticatedUser,
requirePermission("participant.read"),
applyEffectiveScope,
participantsController.list
);

For resource-by-ID requests:

GET /participants/{id}

the API must also verify that the participant belongs within the caller's effective scope.

Knowing a UUID must never bypass authorisation.

12. /api/v1/me

This should now become a critical endpoint.

After Clerk login, React calls:

GET /api/v1/me

Recommended response:

{
"data": {
"id": "internal-user-uuid",

    "profile": {
      "displayName": "Sarah Johnson",
      "email": "sarah@example.com"
    },

    "organisation": {
      "id": "org-uuid",
      "name": "Acme Ltd"
    },

    "roles": [
      {
        "code": "MANAGER",
        "name": "Manager"
      }
    ],

    "permissions": [
      "participant.read",
      "assignment.read",
      "assignment.manage",
      "analytics.team.view"
    ],

    "scope": {
      "type": "SCOPED",

      "locations": [
        {
          "id": "birmingham-id",
          "name": "Birmingham"
        }
      ],

      "departments": [
        {
          "id": "operations-id",
          "name": "Operations",
          "locationId": "birmingham-id"
        }
      ],

      "teams": []
    }

}
}

Organisation Admin might receive:

{
"scope": {
"type": "ORGANISATION"
}
}

Participant:

{
"scope": {
"type": "SELF"
}
} 13. Nielsen Frontend Rules

This is where the authorization architecture translates into UX.

Recognition rather than recall

Display:

Manager

Birmingham
Operations
Warehouse

not:

MANAGER
DEPT_SCOPED
departmentIds=[...]
Error prevention

If a Manager only has Birmingham access:

Do not offer London in a filter.

If a Creator cannot publish:

Do not present a large blue Publish button that just fails with 403.

Depending on context:

hide an action that is permanently unavailable;
disable + explain when the action may become available.
Consistency

All pages should use the same permission-aware components:

<Can permission="assessment.publish">
    <Button>Publish assessment</Button>
</Can>

The component is for UX only.

It does not replace backend enforcement.

Visibility of system status

Where scope matters, show it.

Manager Workspace:

Viewing

Birmingham
Operations + Warehouse

If only one permitted location exists, there's no need for a location filter.

Minimalist design

Each role gets navigation designed for its job.

Do not create:

one giant sidebar

- disable 60% of options

Prefer:

navigation generated from effective permissions 14. Multiple Roles

Design for this from the start.

A user could be:

Sarah

Manager
Birmingham → Operations

Trainer
Birmingham → Operations + Warehouse

The API resolves the union of the capabilities and scopes.

The frontend should not ask Sarah to "switch role" merely to access functionality unless there is a strong business reason.

Instead, /me returns her effective access.

15. Login → Workspace Routing

After Clerk authenticates:

Login
↓
GET /me
↓
Resolve effective role/access

Then route according to the primary experience.

Examples:

Content Creator
→ Creator Workspace

Manager
→ Manager Workspace

Executive
→ Executive Workspace

Trainer
→ My Sessions

Participant
→ My Training

Organisation Admin
→ Admin Workspace

If a user has multiple roles, you should define a primary role/homepage preference rather than making the routing unpredictable.

16. Rules I'd Put in the Developer Specification

RULE AUTH-01
Clerk authenticates users. QuizAnalytics authorises them.

RULE AUTH-02
Organisation Admin and Executive have organisation-wide scope by default. Executive access remains reporting-focused rather than administrative.

RULE AUTH-03
All other roles are restricted to their effective assigned organisational scope.

RULE AUTH-04
Locations, departments and teams are optional organisational levels. Scope operates at the lowest configured level appropriate for the customer.

RULE AUTH-05
Backend APIs enforce permissions and scope on every request.

RULE AUTH-06
Frontend permissions exist to improve UX, not provide security.

RULE AUTH-07
Navigation, filters and actions must contain only options relevant to effective access.

RULE AUTH-08
Multiple roles are supported and effective access is resolved by the backend.

RULE AUTH-09
/api/v1/me is the authoritative frontend contract for current user, roles, permissions and scope.

RULE AUTH-10
Changing a role or scope must affect subsequent authorised API requests immediately and create an audit event.
