import { isUserWithinScope } from "./userInScope";
import { User } from "./User";
import { UserEmail } from "./valueObjects/UserEmail";
import { EffectiveScope } from "../../../shared/core/EffectiveScope";

function makeUser(overrides: { locationId?: string | null; departmentId?: string | null } = {}): User {
    return new User(
        {
            firstName: "Sarah",
            lastName: "Johnson",
            email: UserEmail.create("sarah@example.com").getValue(),
            status: "ACTIVE",
            department: overrides.departmentId ? { id: overrides.departmentId, name: "Operations" } : null,
            location: overrides.locationId ? { id: overrides.locationId, name: "Birmingham" } : null,
            roles: [],
            lastLoginAt: null,
            invitationSentAt: null,
        },
        "user-1"
    );
}

describe("isUserWithinScope", () => {
    it("is always in scope when no scope is given", () => {
        expect(isUserWithinScope(makeUser(), undefined)).toBe(true);
    });

    it("is always in scope for ORGANISATION", () => {
        const scope: EffectiveScope = { type: "ORGANISATION", userId: "someone-else", allLocations: true, locationIds: [], departmentIds: [] };
        expect(isUserWithinScope(makeUser({ locationId: "loc-1" }), scope)).toBe(true);
    });

    describe("SELF scope", () => {
        it("is in scope only when the user is the caller", () => {
            const scope: EffectiveScope = { type: "SELF", userId: "user-1", allLocations: false, locationIds: [], departmentIds: [] };
            expect(isUserWithinScope(makeUser(), scope)).toBe(true);
        });

        it("is out of scope for anyone else", () => {
            const scope: EffectiveScope = { type: "SELF", userId: "someone-else", allLocations: false, locationIds: [], departmentIds: [] };
            expect(isUserWithinScope(makeUser(), scope)).toBe(false);
        });
    });

    describe("SCOPED scope", () => {
        it("is in scope when both location and department match", () => {
            const scope: EffectiveScope = {
                type: "SCOPED",
                userId: "caller",
                allLocations: false,
                locationIds: ["loc-1"],
                departmentIds: ["dep-1"],
            };
            const user = makeUser({ locationId: "loc-1", departmentId: "dep-1" });
            expect(isUserWithinScope(user, scope)).toBe(true);
        });

        it("is out of scope when the location doesn't match", () => {
            const scope: EffectiveScope = {
                type: "SCOPED",
                userId: "caller",
                allLocations: false,
                locationIds: ["loc-1"],
                departmentIds: [],
            };
            const user = makeUser({ locationId: "loc-2" });
            expect(isUserWithinScope(user, scope)).toBe(false);
        });

        it("is out of scope when the user has no location and one is required", () => {
            const scope: EffectiveScope = {
                type: "SCOPED",
                userId: "caller",
                allLocations: false,
                locationIds: ["loc-1"],
                departmentIds: [],
            };
            expect(isUserWithinScope(makeUser(), scope)).toBe(false);
        });

        it("ignores location when allLocations is set, still enforcing department", () => {
            const scope: EffectiveScope = {
                type: "SCOPED",
                userId: "caller",
                allLocations: true,
                locationIds: [],
                departmentIds: ["dep-1"],
            };
            expect(isUserWithinScope(makeUser({ locationId: "loc-99", departmentId: "dep-1" }), scope)).toBe(true);
            expect(isUserWithinScope(makeUser({ locationId: "loc-99", departmentId: "dep-2" }), scope)).toBe(false);
        });

        it("is out of scope when the department doesn't match", () => {
            const scope: EffectiveScope = {
                type: "SCOPED",
                userId: "caller",
                allLocations: false,
                locationIds: [],
                departmentIds: ["dep-1"],
            };
            const user = makeUser({ departmentId: "dep-2" });
            expect(isUserWithinScope(user, scope)).toBe(false);
        });
    });
});
