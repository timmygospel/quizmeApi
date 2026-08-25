// PERMISSIONS.md §3/§11 — the union-of-roles scope a caller is restricted to.
// Lives in shared/core (rather than shared/infra/http, where it's resolved)
// so domain-layer repository interfaces can depend on it without reaching
// into the HTTP layer.
export type EffectiveScopeType = "ORGANISATION" | "SCOPED" | "SELF";

export interface EffectiveScope {
    type: EffectiveScopeType;
    userId: string;
    allLocations: boolean;
    locationIds: string[];
    departmentIds: string[];
}
