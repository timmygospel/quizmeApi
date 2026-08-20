import { UserStatus } from "./User";

// Mirrors USERS_ROLES.md §38 "User Status Transitions" — ARCHIVED is a
// terminal state; reviving an archived user needs an explicit Restore
// workflow that hasn't been built yet.
const ALLOWED_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
    INVITED: ["ACTIVE", "ARCHIVED"],
    ACTIVE: ["SUSPENDED", "ARCHIVED"],
    SUSPENDED: ["ACTIVE", "ARCHIVED"],
    ARCHIVED: [],
};

export function canTransitionUserStatus(from: UserStatus, to: UserStatus): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
}
