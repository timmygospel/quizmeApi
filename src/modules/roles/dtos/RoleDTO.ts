export interface RoleDTO {
    id?: string;
    code: string;
    name: string;
    description: string;
    type: string;
    userCount: number;
    permissions: string[];
    archivedAt: string | null;
    createdAt?: string;
    updatedAt?: string;
}
