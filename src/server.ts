import dotenv from "dotenv";
import http from "http";
import app from "./app";
import { initSocketServer } from "./socket";

dotenv.config();

const PORT = Number(process.env.PORT || 8080);

const server = http.createServer(app);
initSocketServer(server);

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on 0.0.0.0:${PORT}`);
});
