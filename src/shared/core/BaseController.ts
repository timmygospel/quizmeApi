import { Request, Response } from "express";

export abstract class BaseController {
    protected req!: Request;
    protected res!: Response;

    public async execute(req: Request, res: Response): Promise<void> {
        this.req = req;
        this.res = res;

        try {
            await this.executeImpl();
        } catch (err: any) {
            console.error("[Controller Error]", err);
            this.fail("An unexpected error occurred");
        }
    }

    protected abstract executeImpl(): Promise<any>;

    public static jsonResponse(res: Response, code: number, message: string) {
        return res.status(code).json({ message });
    }

    public ok<T>(dto?: T) {
        if (dto) {
            this.res.type("application/json");
            return this.res.status(200).json(dto);
        } else {
            return this.res.sendStatus(200);
        }
    }

    public created<T>(dto?: T) {
        if (dto) {
            this.res.type("application/json");
            return this.res.status(201).json(dto);
        }
        return this.res.sendStatus(201);
    }

    public clientError(message?: string) {
        return BaseController.jsonResponse(this.res, 400, message ?? "Bad Request");
    }

    public unauthorized(message?: string) {
        return BaseController.jsonResponse(this.res, 401, message ?? "Unauthorized");
    }

    public paymentRequired(message?: string) {
        return BaseController.jsonResponse(this.res, 402, message ?? "Payment Required");
    }

    public forbidden(message?: string) {
        return BaseController.jsonResponse(this.res, 403, message ?? "Forbidden");
    }

    public notFound(message?: string) {
        return BaseController.jsonResponse(this.res, 404, message ?? "Not Found");
    }

    public conflict(message?: string) {
        return BaseController.jsonResponse(this.res, 409, message ?? "Conflict");
    }

    public tooMany(message?: string) {
        return BaseController.jsonResponse(this.res, 429, message ?? "Too Many Requests");
    }

    public fail(error: any) {
        console.error("[Controller Failure]:", error);
        return this.res.status(500).json({
            message: error instanceof Error ? error.message : String(error),
        });
    }
}
