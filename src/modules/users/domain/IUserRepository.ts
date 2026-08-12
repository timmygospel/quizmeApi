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

export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    findAll(filters: UserListFilters): Promise<UserListResult>;
}
