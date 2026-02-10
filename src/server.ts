import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import app from "./app";
import { initSocketServer } from "./socket";

dotenv.config();

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mfquiz";

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB connected");

        // ✅ Create one HTTP server for both Express + Socket.IO
        const server = http.createServer(app);

        // ✅ Attach Socket.IO to the same server
        initSocketServer(server);

        // ✅ Start server
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    });
