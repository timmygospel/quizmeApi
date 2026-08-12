export interface RoleDTO {
    id?: string;
    code: string;
    name: string;
    description: string;
    type: string;
    userCount: number;
    createdAt?: string;
    updatedAt?: string;
}
