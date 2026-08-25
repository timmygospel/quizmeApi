// Per PERMISSIONS.md §9 — Participant is "scope = SELF": it must never see
// another user's data, even though the current data model still requires an
// explicit location/department (or all_locations) row for every non-org-wide
// role assignment (see AssignUserRoleUseCase SCOPE_REQUIRED). Rather than
// trust whatever scope rows a Participant assignment happens to carry,
// callers resolving effective scope should treat these role codes as
// self-only regardless of stored location/department scope.
const SELF_ONLY_ROLE_CODES = new Set(["PARTICIPANT"]);

export function isSelfOnlyRole(code: string): boolean {
    return SELF_ONLY_ROLE_CODES.has(code);
}
