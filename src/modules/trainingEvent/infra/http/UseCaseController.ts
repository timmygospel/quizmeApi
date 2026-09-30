import { Request } from "express";
import { BaseController } from "../../../../shared/core/BaseController";
import { Result } from "../../../../shared/core/Result";

// One controller for every Training Event endpoint: each route just says which use case to call.
// Failures are tagged the same way as the testSession module ("NOT_FOUND: …", etc.).
export class UseCaseController<T> extends BaseController {
    constructor(private readonly handler: (req: Request) => Promise<Result<T>>, private readonly status: 200 | 201 = 200) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const result = await this.handler(this.req);
        if (result.isFailure) {
            const error = result.errorValue();
            const [tag, ...rest] = error.split(":");
            const message = rest.join(":").trim();
            if (tag === "NOT_FOUND") this.notFound(message);
            else if (tag === "FORBIDDEN") this.forbidden(message);
            else if (tag === "CONFLICT") this.conflict(message);
            else if (tag === "UNAUTHORIZED") this.unauthorized(message);
            else this.clientError(error);
            return;
        }
        const value = result.getValue();
        if (value === undefined) {
            this.res.sendStatus(204);
            return;
        }
        if (this.status === 201) this.created(value);
        else this.ok(value);
    }
}
