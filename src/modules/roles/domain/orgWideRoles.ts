// Per USERS_ROLES.md §2 "Organisation-Wide Roles" — only Administrator and
// Executive get organisation-wide visibility by default. Every other role
// (including future custom roles) must be assigned an explicit scope.
const ORG_WIDE_ROLE_CODES = new Set(["ADMINISTRATOR", "EXECUTIVE"]);

export function isOrgWideRole(code: string): boolean {
    return ORG_WIDE_ROLE_CODES.has(code);
}
