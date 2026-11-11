import { Server } from "socket.io";
import { notifyLiveEventEnded } from "./liveEventHandlers";

// liveEventHandlers opens Redis/Postgres clients at import time; stub them so the test exits cleanly.
jest.mock("../shared/infra/redis/redisClient", () => ({ redis: null, redisPub: null, redisSub: null }));
jest.mock("../modules/liveEvents/infra/db/PgLiveEventRepository", () => ({ PgLiveEventRepository: jest.fn() }));

describe("notifyLiveEventEnded", () => {
    it("emits event:ended to the event's participant and admin rooms", () => {
        const emit = jest.fn();
        const to = jest.fn();
        const chain = { to, emit };
        to.mockReturnValue(chain);
        notifyLiveEventEnded(() => ({ to } as unknown as Server), " abc123 ");
        expect(to).toHaveBeenCalledWith("live:ABC123");
        expect(to).toHaveBeenCalledWith("live:ABC123:admin");
        expect(emit).toHaveBeenCalledWith("event:ended", { eventCode: "ABC123" });
    });

    it("does nothing when the socket server isn't running", () => {
        expect(() =>
            notifyLiveEventEnded(() => { throw new Error("Socket.IO not initialized"); }, "ABC123")
        ).not.toThrow();
    });
});
