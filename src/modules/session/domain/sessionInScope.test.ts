import { isSessionWithinScope } from "./sessionInScope";
import { Session } from "./Session";
import { SessionName } from "./valueObjects/SessionName";
import { EffectiveScope } from "../../../shared/core/EffectiveScope";

function makeSession(overrides: { locationIds?: string[]; departmentIds?: string[]; allLocations?: boolean } = {}): Session {
    return new Session(
        {
            templateId: "template-1",
            name: SessionName.create("Q1 Compliance").getValue(),
            departmentIds: overrides.departmentIds ?? [],
            locationIds: overrides.locationIds ?? [],
            allLocations: overrides.allLocations ?? false,
            sectionIds: [],
            host: "Jane Doe",
            sessionType: "assessment",
            passThreshold: 70,
            allowMultipleAttempts: false,
            additionalNotes: "",
        },
        "session-1"
    );
}

describe("isSessionWithinScope", () => {
    it("is always in scope when no scope is given", () => {
        expect(isSessionWithinScope(makeSession(), undefined)).toBe(true);
    });

    it("is always in scope for ORGANISATION", () => {
        const scope: EffectiveScope = { type: "ORGANISATION", userId: "u", allLocations: true, locationIds: [], departmentIds: [] };
        expect(isSessionWithinScope(makeSession({ locationIds: ["loc-1"] }), scope)).toBe(true);
    });

    it("is never in scope for SELF", () => {
        const scope: EffectiveScope = { type: "SELF", userId: "u", allLocations: false, locationIds: [], departmentIds: [] };
        expect(isSessionWithinScope(makeSession(), scope)).toBe(false);
    });

    describe("SCOPED", () => {
        it("is in scope when the session's location overlaps the caller's scope", () => {
            const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };
            expect(isSessionWithinScope(makeSession({ locationIds: ["loc-1", "loc-2"] }), scope)).toBe(true);
        });

        it("is out of scope when locations don't overlap", () => {
            const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };
            expect(isSessionWithinScope(makeSession({ locationIds: ["loc-2"] }), scope)).toBe(false);
        });

        it("is in scope regardless of the session's locations when the session targets all locations", () => {
            const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };
            expect(isSessionWithinScope(makeSession({ allLocations: true, locationIds: [] }), scope)).toBe(true);
        });

        it("is in scope regardless of the session's locations when the caller has allLocations", () => {
            const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: true, locationIds: [], departmentIds: [] };
            expect(isSessionWithinScope(makeSession({ locationIds: ["loc-99"] }), scope)).toBe(true);
        });

        it("is in scope when the session has no department restriction of its own", () => {
            const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: true, locationIds: [], departmentIds: ["dep-1"] };
            expect(isSessionWithinScope(makeSession({ departmentIds: [] }), scope)).toBe(true);
        });

        it("is out of scope when the session's departments don't overlap the caller's", () => {
            const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: true, locationIds: [], departmentIds: ["dep-1"] };
            expect(isSessionWithinScope(makeSession({ departmentIds: ["dep-2"] }), scope)).toBe(false);
        });

        it("is in scope when both location and department overlap", () => {
            const scope: EffectiveScope = {
                type: "SCOPED",
                userId: "u",
                allLocations: false,
                locationIds: ["loc-1"],
                departmentIds: ["dep-1"],
            };
            expect(isSessionWithinScope(makeSession({ locationIds: ["loc-1"], departmentIds: ["dep-1"] }), scope)).toBe(true);
        });
    });
});
