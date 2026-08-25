// The only interface the rest of the app is allowed to depend on for
// identity/authentication. A concrete provider (Clerk today; Cognito, Auth0,
// Entra ID, or any other OIDC provider later) implements this and nothing
// else in the codebase should import a provider SDK directly.
export interface VerifiedIdentity {
    providerUserId: string;
    email: string | null;
}

// What this provider actually supports, so the frontend can adapt its UI
// (e.g. only show "Forgot password?" when passwordReset is true) instead of
// assuming every provider is password-based. See CLEARK.md "Password Reset
// & Account Recovery" / "Important abstraction rule".
export interface AuthCapabilities {
    passwordAuthentication: boolean;
    passwordReset: boolean;
    socialLogin: boolean;
    enterpriseSSO: boolean;
}

export interface IAuthProvider {
    readonly name: string;
    readonly capabilities: AuthCapabilities;
    verify(token: string): Promise<VerifiedIdentity | null>;
}
