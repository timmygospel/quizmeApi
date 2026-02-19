import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redisPub, redisSub } from "../shared/infra/redis/redisClient";
import { registerLiveEventHandlers } from "./liveEventHandlers";

let io: Server | null = null;

export function initSocketServer(server: HttpServer) {
    io = new Server(server, {
        cors: {
            origin: ["http://localhost:5173", "https://mfquiz-web.fly.dev"],
            methods: ["GET", "POST"],
        },
        transports:
            process.env.NODE_ENV === "production"
                ? ["websocket"]
                : ["websocket", "polling"],
    });

    if (redisPub && redisSub) {
        io.adapter(createAdapter(redisPub, redisSub));
        console.log("✅ Socket.IO Redis adapter attached");
    } else {
        console.warn("⚠️ Socket.IO running without Redis adapter");
    }

    registerLiveEventHandlers(io);

    return io;
}

export function getIO(): Server {
    if (!io) throw new Error("Socket.IO not initialized");
    return io;
}
