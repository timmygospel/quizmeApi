export interface AssignUserRoleDTO {
    userId: string;
    roleId: string;
    allLocations?: boolean;
    locationIds?: string[];
    departmentIds?: string[];
}
