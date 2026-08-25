import { User } from "./User";
import { EffectiveScope } from "../../../shared/core/EffectiveScope";

// PERMISSIONS.md §11 — "Knowing a UUID must never bypass authorisation."
// Mirrors PgUserRepository.buildScopeConditions' semantics, but applied to an
// already-hydrated User (for a single-resource fetch, where filtering happens
// after the row is loaded rather than in the WHERE clause).
export function isUserWithinScope(user: User, scope: EffectiveScope | undefined): boolean {
    if (!scope || scope.type === "ORGANISATION") return true;

    if (scope.type === "SELF") return user.id === scope.userId;

    const locationOk = scope.allLocations || scope.locationIds.length === 0 || (!!user.location && scope.locationIds.includes(user.location.id));
    const departmentOk = scope.departmentIds.length === 0 || (!!user.department && scope.departmentIds.includes(user.department.id));
    return locationOk && departmentOk;
}
