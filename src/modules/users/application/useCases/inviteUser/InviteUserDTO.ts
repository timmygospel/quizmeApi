export interface InviteUserDTO {
    email: string;
    firstName: string;
    lastName: string;
    roleIds: string[];
    departmentId?: string | null;
    locationId?: string | null;
}
