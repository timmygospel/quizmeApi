import { Session } from "./Session";
import { EffectiveScope } from "../../../shared/core/EffectiveScope";

function overlaps(a: string[], b: string[]): boolean {
    return a.some((id) => b.includes(id));
}

// PERMISSIONS.md §3/§11 — a session's audience (departmentIds/locationIds/
// allLocations) IS its scope, unlike quiz/questionBank/category which have
// no location/department dimension in this schema at all and so aren't
// scope-filterable.
//
// SELF is deliberately "never in scope": a session isn't a self-owned
// resource, and no role currently holding a self-only scope (Participant)
// is granted session.read anyway — this is a safe default, not a real path.
export function isSessionWithinScope(session: Session, scope: EffectiveScope | undefined): boolean {
    if (!scope || scope.type === "ORGANISATION") return true;
    if (scope.type === "SELF") return false;

    const locationOk =
        scope.allLocations ||
        scope.locationIds.length === 0 ||
        session.allLocations ||
        overlaps(session.locationIds, scope.locationIds);

    const departmentOk =
        scope.departmentIds.length === 0 ||
        session.departmentIds.length === 0 ||
        overlaps(session.departmentIds, scope.departmentIds);

    return locationOk && departmentOk;
}
