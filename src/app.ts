import express from "express";
import cors from "cors";
import { redis } from "./shared/infra/redis/redisClient";

import quizRoutes from "./modules/quiz/infra/http/quizRoutes";
import categoryRoutes from "./modules/quiz/infra/http/categoryRoutes";
import questionBankRoutes from "./modules/quiz/infra/http/questionBankRoutes";
import liveEventRoutes from "./modules/liveEvents/infra/http/liveEventRoutes";

const app = express();

app.use(express.json());

const allowedOrigins = [
    "http://localhost:5173",
    "https://mfquiz-web.fly.dev",
];

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            if (allowedOrigins.includes(origin)) return cb(null, true);
            return cb(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: false, // switch to true only if cookie auth is added
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.options("*", cors());
app.get("/health", async (_req, res) => {
    if (!redis) {
        res.status(200).json({ status: "ok" });
        return;
    }
    try {
        await redis.ping();
        res.status(200).json({ status: "ok", redis: "ok" });
    } catch {
        res.status(503).json({ status: "degraded", redis: "error" });
    }
});
app.use("/api/v1", quizRoutes);
app.use("/api/v1", categoryRoutes);
app.use("/api/v1", questionBankRoutes);
app.use("/api/v1", liveEventRoutes);

export default app;
