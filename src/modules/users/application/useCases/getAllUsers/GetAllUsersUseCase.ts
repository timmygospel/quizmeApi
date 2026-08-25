import { Result } from "../../../../../shared/core/Result";
import { IUserRepository } from "../../../domain/IUserRepository";
import { User } from "../../../domain/User";
import { GetAllUsersDTO } from "./GetAllUsersDTO";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export interface GetAllUsersResult {
    items: User[];
    totalItems: number;
    page: number;
    pageSize: number;
}

export class GetAllUsersUseCase {
    constructor(private repo: IUserRepository) { }

    async execute(request: GetAllUsersDTO): Promise<Result<GetAllUsersResult>> {
        try {
            const page = request.page && request.page > 0 ? Math.floor(request.page) : 1;
            const pageSize =
                request.pageSize && request.pageSize > 0
                    ? Math.min(Math.floor(request.pageSize), MAX_PAGE_SIZE)
                    : DEFAULT_PAGE_SIZE;

            const { items, totalItems } = await this.repo.findAll({
                search: request.search,
                roleId: request.roleId,
                departmentId: request.departmentId,
                locationId: request.locationId,
                status: request.status,
                scope: request.scope,
                page,
                pageSize,
            });

            return Result.ok({ items, totalItems, page, pageSize });
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
