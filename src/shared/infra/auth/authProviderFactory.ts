import { IAuthProvider } from "./IAuthProvider";
import { ClerkAuthProvider } from "./ClerkAuthProvider";

// Reads AUTH_PROVIDER to pick which IAuthProvider implementation to wire up.
// Swapping to Cognito/Auth0/Entra ID later means adding a case here — no
// other file in the app should need to change.
export function createAuthProvider(): IAuthProvider | null {
    const provider = (process.env.AUTH_PROVIDER || "clerk").toLowerCase();

    switch (provider) {
        case "clerk": {
            const secretKey = process.env.CLERK_SECRET_KEY;
            if (!secretKey) return null;
            return new ClerkAuthProvider(secretKey);
        }
        default:
            throw new Error(`Unsupported AUTH_PROVIDER: "${provider}"`);
    }
}
