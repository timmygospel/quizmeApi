// A single location+department pairing a Test Session targets (SESSION-BE-002).
// Team stays a bare nullable id — this codebase has no `teams` table anywhere
// (see schema.sql's user_role_locations/user_role_departments comment), and
// the spec only requires team to be optional, never that it be a first-class
// managed entity.
export interface AudienceRule {
    locationId: string;
    departmentId: string;
    teamId?: string | null;
}
