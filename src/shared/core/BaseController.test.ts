import { Request, Response } from "express";
import { BaseController } from "./BaseController";

// Routes share one controller instance, so overlapping requests must not share req/res.
class EchoController extends BaseController {
    public gates: Record<string, Promise<void>> = {};

    protected async executeImpl(): Promise<void> {
        const name = String(this.req.query.name);
        await this.gates[name];
        this.ok({ name });
    }
}

class ThrowsAfterRespondingController extends BaseController {
    protected async executeImpl(): Promise<void> {
        this.ok({ done: true });
        throw new Error("failed after the response was sent");
    }
}

const fakeReq = (name: string) => ({ query: { name } } as unknown as Request);

/** Behaves like Express: a second response on the same res throws ERR_HTTP_HEADERS_SENT. */
const fakeRes = () => {
    const res: any = {
        headersSent: false,
        statusCode: 0,
        body: undefined,
        type: () => res,
        status: (code: number) => {
            if (res.headersSent) throw new Error("Cannot set headers after they are sent to the client");
            res.statusCode = code;
            return res;
        },
        json: (body: unknown) => {
            res.body = body;
            res.headersSent = true;
            return res;
        },
    };
    return res as Response & { body: unknown; statusCode: number; headersSent: boolean };
};

describe("BaseController", () => {
    beforeEach(() => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("answers overlapping requests on their own responses", async () => {
        const controller = new EchoController();
        let releaseFirst = () => {};
        controller.gates.first = new Promise((resolve) => { releaseFirst = resolve; });
        controller.gates.second = Promise.resolve();

        const firstRes = fakeRes();
        const secondRes = fakeRes();

        const first = controller.execute(fakeReq("first"), firstRes);
        const second = controller.execute(fakeReq("second"), secondRes);
        await second;
        releaseFirst();
        await first;

        expect(firstRes.body).toEqual({ name: "first" });
        expect(secondRes.body).toEqual({ name: "second" });
    });

    it("does not reject (which would crash the process) when failing after a response was sent", async () => {
        const res = fakeRes();

        await expect(
            new ThrowsAfterRespondingController().execute(fakeReq("any"), res)
        ).resolves.toBeUndefined();

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ done: true });
    });
});
