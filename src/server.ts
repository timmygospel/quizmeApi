import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import app from "./app";
import { initSocketServer } from "./socket";

dotenv.config();

const PORT = Number(process.env.PORT || 8080);
const MONGO_URI = process.env.MONGO_URI;

console.log("🔎 MONGO_URI exists?", Boolean(MONGO_URI));

const server = http.createServer(app);
initSocketServer(server);

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on 0.0.0.0:${PORT}`);
});

if (!MONGO_URI) {
    console.error("❌ MONGO_URI is not set");
} else {
    mongoose
        .connect(MONGO_URI)
        .then(() => console.log("✅ MongoDB connected"))
        .catch((err) => console.error("❌ MongoDB connection error:", err));
}
