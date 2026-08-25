import { ClerkClient, createClerkClient, verifyToken } from "@clerk/backend";
import { AuthCapabilities, IAuthProvider, VerifiedIdentity } from "./IAuthProvider";

export class ClerkAuthProvider implements IAuthProvider {
    public readonly name = "clerk";
    // Clerk's hosted flows cover email/password with reset, plus social
    // login; enterprise SSO (SAML/OIDC connections) is a paid add-on this
    // instance isn't configured for.
    public readonly capabilities: AuthCapabilities = {
        passwordAuthentication: true,
        passwordReset: true,
        socialLogin: true,
        enterpriseSSO: false,
    };
    private readonly client: ClerkClient;
    private readonly secretKey: string;

    constructor(secretKey: string) {
        this.secretKey = secretKey;
        this.client = createClerkClient({ secretKey });
    }

    async verify(token: string): Promise<VerifiedIdentity | null> {
        try {
            const payload = await verifyToken(token, { secretKey: this.secretKey });
            const providerUserId = payload.sub;
            if (!providerUserId) return null;

            const clerkUser = await this.client.users.getUser(providerUserId);
            const email =
                clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
                clerkUser.emailAddresses[0]?.emailAddress ??
                null;

            return { providerUserId, email };
        } catch (err) {
            console.error("[ClerkAuthProvider.verify]", err);
            return null;
        }
    }
}
