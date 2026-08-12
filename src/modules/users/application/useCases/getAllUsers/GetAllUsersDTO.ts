import { UserStatus } from "../../../domain/User";

export interface GetAllUsersDTO {
    search?: string;
    roleId?: string;
    departmentId?: string;
    locationId?: string;
    status?: UserStatus;
    page?: number;
    pageSize?: number;
}
