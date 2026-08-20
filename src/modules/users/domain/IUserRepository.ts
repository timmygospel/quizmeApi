import { User, UserStatus } from "./User";

export interface UserListFilters {
    search?: string;
    roleId?: string;
    departmentId?: string;
    locationId?: string;
    status?: UserStatus;
    page: number;
    pageSize: number;
}

export interface UserListResult {
    items: User[];
    totalItems: number;
}

export interface CreateUserInput {
    email: string;
    firstName: string;
    lastName: string;
    departmentId: string | null;
    locationId: string | null;
    roleIds: string[];
}

export interface RoleScopeInput {
    allLocations: boolean;
    locationIds: string[];
    departmentIds: string[];
}

export interface OrgRefLite {
    id: string;
    name: string;
}

export interface AssignedRoleScope {
    role: { id: string; code: string; name: string };
    allLocations: boolean;
    locations: OrgRefLite[];
    departments: OrgRefLite[];
}

export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findAll(filters: UserListFilters): Promise<UserListResult>;
    create(input: CreateUserInput): Promise<User>;
    markInvitationSent(id: string): Promise<User>;
    updateStatus(id: string, status: UserStatus): Promise<User>;
    isSoleActiveAdministrator(id: string): Promise<boolean>;
    hasRole(userId: string, roleId: string): Promise<boolean>;
    assignRole(userId: string, roleId: string, scope: RoleScopeInput): Promise<void>;
    removeRole(userId: string, roleId: string): Promise<void>;
    findEffectiveAccess(userId: string): Promise<AssignedRoleScope[]>;
}
