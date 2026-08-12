import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAllUsersUseCase } from "../../../application/useCases/getAllUsers/GetAllUsersUseCase";
import { UserMap } from "../../../mappers/UserMap";
import { UserStatus } from "../../../domain/User";

const VALID_STATUSES: UserStatus[] = ["INVITED", "ACTIVE", "SUSPENDED", "ARCHIVED"];

function asString(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
}

export class GetAllUsersController extends BaseController {
    constructor(private readonly useCase: GetAllUsersUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const { search, roleId, departmentId, locationId, status, page, pageSize } = this.req.query;

        const statusCandidate = asString(status)?.toUpperCase();
        const statusFilter =
            statusCandidate && VALID_STATUSES.includes(statusCandidate as UserStatus)
                ? (statusCandidate as UserStatus)
                : undefined;

        const result = await this.useCase.execute({
            search: asString(search),
            roleId: asString(roleId),
            departmentId: asString(departmentId),
            locationId: asString(locationId),
            status: statusFilter,
            page: asString(page) ? Number(page) : undefined,
            pageSize: asString(pageSize) ? Number(pageSize) : undefined,
        });

        if (result.isFailure) {
            this.fail(result.errorValue());
            return;
        }

        const { items, totalItems, page: resolvedPage, pageSize: resolvedPageSize } = result.getValue();

        this.ok({
            data: items.map(UserMap.toDTO),
            meta: { page: resolvedPage, pageSize: resolvedPageSize, totalItems },
        });
    }
}
