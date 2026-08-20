import { Permission } from "./Permission";
import { Role } from "./Role";

export interface CreateRoleInput {
    code: string;
    name: string;
    description: string;
    permissionCodes: string[];
}

export interface UpdateRoleInput {
    name?: string;
    description?: string;
}

export interface IRoleRepository {
    findById(id: string): Promise<Role | null>;
    findByCode(code: string): Promise<Role | null>;
    findAll(): Promise<Role[]>;
    create(input: CreateRoleInput): Promise<Role>;
    update(id: string, input: UpdateRoleInput): Promise<Role>;
    archive(id: string): Promise<Role>;
    setPermissions(roleId: string, permissionCodes: string[]): Promise<Role>;
    findAllPermissions(): Promise<Permission[]>;
}
