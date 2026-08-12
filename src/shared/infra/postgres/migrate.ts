import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { pgPool } from "./pgClient";

dotenv.config();

async function migrate() {
    const schemaPath = path.join(__dirname, "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");
    await pgPool.query(sql);
    console.log("✅ Postgres schema migrated");
    await pgPool.end();
}

migrate().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
