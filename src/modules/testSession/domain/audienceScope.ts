import { AudienceRule } from "./AudienceRule";
import { EffectiveScope } from "../../../shared/core/EffectiveScope";

// PERMISSIONS.md §11's "Session audience/resource check" step, applied to a
// Test Session's proposed/actual audience rules. Mirrors
// PgUserRepository.buildScopeConditions' semantics exactly — an empty
// locationIds/departmentIds array on a SCOPED role means "unrestricted on
// that axis", not "no one" — so behaviour stays consistent with every other
// scope check in the codebase.
export function isAudienceWithinScope(rules: AudienceRule[], scope?: EffectiveScope): boolean {
    if (!scope || scope.type === "ORGANISATION") return true;
    if (scope.type === "SELF") return false;

    return rules.every((rule) => {
        const locationOk = scope.allLocations || scope.locationIds.length === 0 || scope.locationIds.includes(rule.locationId);
        const departmentOk = scope.departmentIds.length === 0 || scope.departmentIds.includes(rule.departmentId);
        return locationOk && departmentOk;
    });
}

// A trainer/manager can always see/manage a Test Session they own, even if
// their scope has since changed; otherwise it must fall within their
// current effective scope via its audience.
export function isTestSessionWithinScope(
    session: { ownerId: string; audience: AudienceRule[] },
    scope?: EffectiveScope
): boolean {
    if (!scope || scope.type === "ORGANISATION") return true;
    if (scope.userId === session.ownerId) return true;
    return isAudienceWithinScope(session.audience, scope);
}
