AUTH-001 — Pluggable Authentication Architecture
Goal

Implement authentication in QuizAnalytics so that the application is not tightly coupled to any specific authentication provider.

The system should support an initial provider such as Clerk, while allowing the team to replace it later with Cognito, Auth0, Microsoft Entra ID, or another OIDC-compatible provider with minimal impact.

The application must separate:

Authentication Provider
↓
QuizAnalytics Authentication Adapter
↓
QuizAnalytics User
↓
Organisation Membership
↓
Roles
↓
Permissions
↓
Location / Department / Team Scope

The external provider is responsible only for identity and authentication.

QuizAnalytics remains responsible for users, organisations, roles, permissions, and access scope.

High-Level Architecture
External Authentication Provider

Clerk
Cognito
Auth0
Microsoft Entra
Other OIDC Provider

              │
              ▼

     Authentication Adapter

              │
              ▼

       QuizAnalytics API

              │
              ▼

        PostgreSQL Identity

              │
              ├── Organisation
              ├── Membership
              ├── Roles
              ├── Permissions
              ├── Locations
              ├── Departments
              └── Teams (optional)

No application feature should communicate directly with Clerk, Cognito, Auth0, or another provider except through the authentication integration layer.
