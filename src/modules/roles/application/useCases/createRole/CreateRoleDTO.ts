export interface CreateRoleDTO {
    name: string;
    description?: string;
    permissionCodes?: string[];
}
