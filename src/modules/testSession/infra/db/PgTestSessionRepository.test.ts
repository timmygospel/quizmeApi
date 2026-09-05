import { buildTestSessionScopeCondition } from "./PgTestSessionRepository";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

describe("buildTestSessionScopeCondition", () => {
    it("adds no restriction when scope is undefined", () => {
        const params: unknown[] = [];
        expect(buildTestSessionScopeCondition(undefined, params)).toBeNull();
        expect(params).toEqual([]);
    });

    it("adds no restriction for ORGANISATION", () => {
        const scope: EffectiveScope = { type: "ORGANISATION", userId: "u", allLocations: true, locationIds: [], departmentIds: [] };
        expect(buildTestSessionScopeCondition(scope, [])).toBeNull();
    });

    it("restricts to owner only for SELF", () => {
        const scope: EffectiveScope = { type: "SELF", userId: "u1", allLocations: false, locationIds: [], departmentIds: [] };
        const params: unknown[] = [];
        expect(buildTestSessionScopeCondition(scope, params)).toBe("ts.owner_id = $1");
        expect(params).toEqual(["u1"]);
    });

    it("allows the owner OR an audience match within scope for SCOPED", () => {
        const scope: EffectiveScope = {
            type: "SCOPED",
            userId: "u1",
            allLocations: false,
            locationIds: ["loc-1"],
            departmentIds: ["dep-1"],
        };
        const params: unknown[] = [];
        const condition = buildTestSessionScopeCondition(scope, params);

        expect(condition).toBe(
            `(ts.owner_id = $1 OR EXISTS (
        SELECT 1 FROM test_session_audiences a WHERE a.test_session_id = ts.id AND a.location_id = ANY($2) AND a.department_id = ANY($3)
    ))`
        );
        expect(params).toEqual(["u1", ["loc-1"], ["dep-1"]]);
    });

    it("skips the location condition when allLocations is set", () => {
        const scope: EffectiveScope = { type: "SCOPED", userId: "u1", allLocations: true, locationIds: [], departmentIds: ["dep-1"] };
        const params: unknown[] = [];
        const condition = buildTestSessionScopeCondition(scope, params);
        expect(condition).toContain("a.department_id = ANY($2)");
        expect(condition).not.toContain("a.location_id");
    });
});
