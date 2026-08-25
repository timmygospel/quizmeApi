import { UserStatus } from "../../../domain/User";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";

export interface GetAllUsersDTO {
    search?: string;
    roleId?: string;
    departmentId?: string;
    locationId?: string;
    status?: UserStatus;
    scope?: EffectiveScope;
    page?: number;
    pageSize?: number;
}
