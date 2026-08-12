import dotenv from "dotenv";
import http from "http";
import app from "./app";
import { initSocketServer } from "./socket";
import { pgPool } from "./shared/infra/postgres/pgClient";

dotenv.config();

const PORT = Number(process.env.PORT || 8080);

console.log("🔎 DATABASE_URL exists?", Boolean(process.env.DATABASE_URL));

const server = http.createServer(app);
initSocketServer(server);

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on 0.0.0.0:${PORT}`);
});

pgPool
    .query("SELECT 1")
    .then(() => console.log("✅ Postgres connected"))
    .catch((err) => console.error("❌ Postgres connection error:", err.message));
