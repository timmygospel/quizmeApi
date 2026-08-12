import { Pool } from "pg";
import dotenv from "dotenv";

// Loaded here (not just in server.ts) because this module is imported
// transitively via app.ts's route imports, which can execute before
// server.ts's own dotenv.config() call runs. dotenv.config() does not
// override already-set env vars, so calling it again is safe.
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error(
        "❌ DATABASE_URL is not set — Postgres-backed modules (departments, locations, hosts, sessions) will fail"
    );
}

export const pgPool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
});

pgPool.on("error", (err) => {
    console.error("❌ Unexpected Postgres pool error:", err.message);
});
