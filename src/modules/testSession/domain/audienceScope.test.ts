import { isAudienceWithinScope, isTestSessionWithinScope } from "./audienceScope";
import { EffectiveScope } from "../../../shared/core/EffectiveScope";
import { AudienceRule } from "./AudienceRule";

const BIRMINGHAM_SALES: AudienceRule = { locationId: "birmingham", departmentId: "sales" };
const MANCHESTER_SALES: AudienceRule = { locationId: "manchester", departmentId: "sales" };

describe("isAudienceWithinScope", () => {
    it("allows anything for ORGANISATION scope", () => {
        const scope: EffectiveScope = { type: "ORGANISATION", userId: "u", allLocations: true, locationIds: [], departmentIds: [] };
        expect(isAudienceWithinScope([BIRMINGHAM_SALES, MANCHESTER_SALES], scope)).toBe(true);
    });

    it("rejects everything for SELF scope", () => {
        const scope: EffectiveScope = { type: "SELF", userId: "u", allLocations: false, locationIds: [], departmentIds: [] };
        expect(isAudienceWithinScope([BIRMINGHAM_SALES], scope)).toBe(false);
    });

    it("allows a Birmingham Sales trainer to target Birmingham Sales", () => {
        const scope: EffectiveScope = {
            type: "SCOPED",
            userId: "u",
            allLocations: false,
            locationIds: ["birmingham"],
            departmentIds: ["sales"],
        };
        expect(isAudienceWithinScope([BIRMINGHAM_SALES], scope)).toBe(true);
    });

    it("rejects a Birmingham Sales trainer targeting Manchester Sales", () => {
        const scope: EffectiveScope = {
            type: "SCOPED",
            userId: "u",
            allLocations: false,
            locationIds: ["birmingham"],
            departmentIds: ["sales"],
        };
        expect(isAudienceWithinScope([MANCHESTER_SALES], scope)).toBe(false);
    });

    it("rejects when only one of multiple audience rules is in scope", () => {
        const scope: EffectiveScope = {
            type: "SCOPED",
            userId: "u",
            allLocations: false,
            locationIds: ["birmingham"],
            departmentIds: ["sales"],
        };
        expect(isAudienceWithinScope([BIRMINGHAM_SALES, MANCHESTER_SALES], scope)).toBe(false);
    });

    it("treats an empty locationIds array as unrestricted on location, matching buildScopeConditions", () => {
        const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: false, locationIds: [], departmentIds: ["sales"] };
        expect(isAudienceWithinScope([MANCHESTER_SALES], scope)).toBe(true);
    });

    it("treats an empty departmentIds array as unrestricted on department", () => {
        const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: false, locationIds: ["birmingham"], departmentIds: [] };
        expect(isAudienceWithinScope([BIRMINGHAM_SALES], scope)).toBe(true);
    });
});

describe("isTestSessionWithinScope", () => {
    it("always allows the owner, even outside their current scope", () => {
        const scope: EffectiveScope = { type: "SCOPED", userId: "owner-1", allLocations: false, locationIds: [], departmentIds: [] };
        const session = { ownerId: "owner-1", audience: [MANCHESTER_SALES] };
        expect(isTestSessionWithinScope(session, scope)).toBe(true);
    });

    it("falls back to audience scope for a non-owner", () => {
        const scope: EffectiveScope = {
            type: "SCOPED",
            userId: "someone-else",
            allLocations: false,
            locationIds: ["birmingham"],
            departmentIds: ["sales"],
        };
        const session = { ownerId: "owner-1", audience: [MANCHESTER_SALES] };
        expect(isTestSessionWithinScope(session, scope)).toBe(false);
    });
});
