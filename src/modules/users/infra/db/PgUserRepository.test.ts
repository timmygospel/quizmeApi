import { buildScopeConditions } from "./PgUserRepository";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

describe("buildScopeConditions", () => {
    it("adds no restriction when scope is undefined", () => {
        const params: unknown[] = [];
        expect(buildScopeConditions(undefined, params)).toEqual([]);
        expect(params).toEqual([]);
    });

    it("adds no restriction for ORGANISATION scope", () => {
        const scope: EffectiveScope = { type: "ORGANISATION", userId: "user-1", allLocations: true, locationIds: [], departmentIds: [] };
        const params: unknown[] = [];
        expect(buildScopeConditions(scope, params)).toEqual([]);
        expect(params).toEqual([]);
    });

    it("restricts to the caller's own id for SELF scope", () => {
        const scope: EffectiveScope = { type: "SELF", userId: "user-1", allLocations: false, locationIds: [], departmentIds: [] };
        const params: unknown[] = [];
        const conditions = buildScopeConditions(scope, params);
        expect(conditions).toEqual(["u.id = $1"]);
        expect(params).toEqual(["user-1"]);
    });

    it("restricts by location and department for SCOPED scope with both sets", () => {
        const scope: EffectiveScope = {
            type: "SCOPED",
            userId: "user-1",
            allLocations: false,
            locationIds: ["loc-1"],
            departmentIds: ["dep-1", "dep-2"],
        };
        const params: unknown[] = [];
        const conditions = buildScopeConditions(scope, params);
        expect(conditions).toEqual(["u.location_id = ANY($1)", "u.department_id = ANY($2)"]);
        expect(params).toEqual([["loc-1"], ["dep-1", "dep-2"]]);
    });

    it("skips the location condition when allLocations is set, even with department scope", () => {
        const scope: EffectiveScope = {
            type: "SCOPED",
            userId: "user-1",
            allLocations: true,
            locationIds: [],
            departmentIds: ["dep-1"],
        };
        const params: unknown[] = [];
        const conditions = buildScopeConditions(scope, params);
        expect(conditions).toEqual(["u.department_id = ANY($1)"]);
        expect(params).toEqual([["dep-1"]]);
    });

    it("skips the department condition when no role granted a specific department", () => {
        const scope: EffectiveScope = {
            type: "SCOPED",
            userId: "user-1",
            allLocations: false,
            locationIds: ["loc-1", "loc-2"],
            departmentIds: [],
        };
        const params: unknown[] = [];
        const conditions = buildScopeConditions(scope, params);
        expect(conditions).toEqual(["u.location_id = ANY($1)"]);
        expect(params).toEqual([["loc-1", "loc-2"]]);
    });

    it("numbers placeholders starting after any params already pushed", () => {
        const scope: EffectiveScope = { type: "SELF", userId: "user-1", allLocations: false, locationIds: [], departmentIds: [] };
        const params: unknown[] = ["existing-param"];
        const conditions = buildScopeConditions(scope, params);
        expect(conditions).toEqual(["u.id = $2"]);
        expect(params).toEqual(["existing-param", "user-1"]);
    });
});
