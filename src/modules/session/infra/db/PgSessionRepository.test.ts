import { buildSessionScopeConditions } from "./PgSessionRepository";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

describe("buildSessionScopeConditions", () => {
    it("adds no restriction when scope is undefined", () => {
        const params: unknown[] = [];
        expect(buildSessionScopeConditions(undefined, params)).toEqual([]);
        expect(params).toEqual([]);
    });

    it("adds no restriction for ORGANISATION", () => {
        const scope: EffectiveScope = { type: "ORGANISATION", userId: "u", allLocations: true, locationIds: [], departmentIds: [] };
        expect(buildSessionScopeConditions(scope, [])).toEqual([]);
    });

    it("excludes everything for SELF", () => {
        const scope: EffectiveScope = { type: "SELF", userId: "u", allLocations: false, locationIds: [], departmentIds: [] };
        const params: unknown[] = [];
        expect(buildSessionScopeConditions(scope, params)).toEqual(["1 = 0"]);
        expect(params).toEqual([]);
    });

    it("restricts by location overlap and department overlap for SCOPED", () => {
        const scope: EffectiveScope = {
            type: "SCOPED",
            userId: "u",
            allLocations: false,
            locationIds: ["loc-1"],
            departmentIds: ["dep-1", "dep-2"],
        };
        const params: unknown[] = [];
        const conditions = buildSessionScopeConditions(scope, params);
        expect(conditions).toEqual([
            "(all_locations = true OR location_ids && $1)",
            "(cardinality(department_ids) = 0 OR department_ids && $2)",
        ]);
        expect(params).toEqual([["loc-1"], ["dep-1", "dep-2"]]);
    });

    it("skips the location condition when allLocations is set", () => {
        const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: true, locationIds: [], departmentIds: ["dep-1"] };
        const params: unknown[] = [];
        const conditions = buildSessionScopeConditions(scope, params);
        expect(conditions).toEqual(["(cardinality(department_ids) = 0 OR department_ids && $1)"]);
    });

    it("skips the department condition when no role granted a specific department", () => {
        const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };
        const params: unknown[] = [];
        const conditions = buildSessionScopeConditions(scope, params);
        expect(conditions).toEqual(["(all_locations = true OR location_ids && $1)"]);
    });

    it("applies a column prefix for an aliased sessions join", () => {
        const scope: EffectiveScope = {
            type: "SCOPED",
            userId: "u",
            allLocations: false,
            locationIds: ["loc-1"],
            departmentIds: ["dep-1"],
        };
        const params: unknown[] = [];
        const conditions = buildSessionScopeConditions(scope, params, "s.");
        expect(conditions).toEqual([
            "(s.all_locations = true OR s.location_ids && $1)",
            "(cardinality(s.department_ids) = 0 OR s.department_ids && $2)",
        ]);
    });

    it("numbers placeholders starting after any params already pushed", () => {
        const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: true, locationIds: [], departmentIds: ["dep-1"] };
        const params: unknown[] = ["existing"];
        const conditions = buildSessionScopeConditions(scope, params);
        expect(conditions).toEqual(["(cardinality(department_ids) = 0 OR department_ids && $2)"]);
        expect(params).toEqual(["existing", ["dep-1"]]);
    });
});
