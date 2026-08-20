export interface UserRoleRefDTO {
    id: string;
    name: string;
}

export interface OrgRefDTO {
    id: string;
    name: string;
}

export interface UserDTO {
    id?: string;
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    status: string;
    roles: UserRoleRefDTO[];
    department: OrgRefDTO | null;
    location: OrgRefDTO | null;
    lastLoginAt: string | null;
    invitationSentAt: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserListDTO {
    data: UserDTO[];
    meta: {
        page: number;
        pageSize: number;
        totalItems: number;
    };
}
