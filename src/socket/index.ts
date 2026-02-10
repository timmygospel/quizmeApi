import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { registerLiveEventHandlers } from "./liveEventHandlers"

let io: Server | null = null;

export function initSocketServer(server: HttpServer) {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:5173",
            methods: ["GET", "POST"],
        },
    });

    registerLiveEventHandlers(io);

    return io;
}

export function getIO(): Server {
    if (!io) throw new Error("Socket.IO not initialized");
    return io;
}
