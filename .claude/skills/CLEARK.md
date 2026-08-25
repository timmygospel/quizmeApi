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

## Password Reset & Account Recovery

The authentication abstraction must support password reset/account recovery for providers that use password-based authentication.

The shared frontend authentication contract should conceptually support:

```
AuthService

signIn()
signOut()

requestPasswordReset()
completePasswordReset()

isAuthenticated
getAccessToken()
currentUser
```

The initial Clerk adapter implements these operations using Clerk. A future Cognito/Auth0/Entra adapter provides its equivalent implementation.

The expected user flow is:

```
Sign In
   ↓
Forgot password?
   ↓
Enter email address
   ↓
Authentication provider verifies identity
   ↓
Verification code / secure recovery mechanism
   ↓
Choose new password
   ↓
Password changed
   ↓
Return to Sign In
```

### Frontend requirements

The frontend should provide a Forgot password? action on the login screen and use the same QuizAnalytics design language as the rest of the product.

The UI should handle:

- Requesting reset
- Verification required
- Invalid/expired code
- New password validation
- Reset successful
- Too many attempts
- Provider/network error

For security, avoid revealing whether an email address belongs to an account. Prefer messaging such as:

> If an account exists for this email address, you'll receive instructions to reset your password.

After successful reset:

> Password updated. You can now sign in with your new password.

### Backend requirements

The QuizAnalytics API should not:

- Store passwords
- Hash passwords
- Generate password-reset tokens
- Email password-reset links/codes
- Maintain password-reset tables

Those responsibilities belong to the configured authentication provider.

Your API continues to care about:

```
Authenticated external identity
          ↓
QuizAnalytics internal user
          ↓
Organisation membership
          ↓
Roles + permissions + scope
```

### Important abstraction rule

Don't design the whole application around the assumption that every provider uses passwords.

For example, a customer may later use:

```
Microsoft Entra SSO
        ↓
No QuizAnalytics password


Google SSO
        ↓
No QuizAnalytics password


Clerk email/password
        ↓
Password recovery available
```

Therefore the adapter should expose provider capabilities as well, conceptually:

```
AuthCapabilities

passwordAuthentication: true
passwordReset: true
socialLogin: true
enterpriseSSO: false
```

The frontend can then show Forgot password? only when the configured authentication method supports it.

## AUTH-001 Definition of Done

AUTH-001 is complete when authentication supports:

- ✓ Sign in
- ✓ Sign out
- ✓ Protected routes
- ✓ Session restoration
- ✓ Session expiry
- ✓ Email verification
- ✓ Forgot password
- ✓ Password reset/recovery
- ✓ API token verification
- ✓ /api/v1/me
- ✓ Internal user mapping
- ✓ Provider abstraction
- ✓ Clerk as initial adapter

The architectural rule remains: QuizAnalytics owns the user and their business access; the authentication provider owns credentials and account authentication/recovery. This keeps password reset working while still allowing you to replace Clerk later.
