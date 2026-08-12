import express from "express";
import cors from "cors";
import { redis } from "./shared/infra/redis/redisClient";

import quizRoutes from "./modules/quiz/infra/http/quizRoutes";
import categoryRoutes from "./modules/category/infra/http/controllers/categoryRoutes";
import questionBankRoutes from "./modules/questionBank/infra/http/questionBankRoutes";
import liveEventRoutes from "./modules/liveEvents/infra/http/liveEventRoutes";
import dashboardRoutes from "./modules/liveEvents/infra/http/dashboardRoutes";
import departmentRoutes from "./modules/department/infra/http/departmentRoutes";
import locationRoutes from "./modules/location/infra/http/locationRoutes";
import hostRoutes from "./modules/host/infra/http/hostRoutes";
import sessionRoutes from "./modules/session/infra/http/sessionRoutes";
import analyticsRoutes from "./modules/analytics/infra/http/analyticsRoutes";
import userRoutes from "./modules/users/infra/http/userRoutes";
import rolesRoutes from "./modules/roles/infra/http/rolesRoutes";

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
app.use("/api/v1", dashboardRoutes);
app.use("/api/v1", departmentRoutes);
app.use("/api/v1", locationRoutes);
app.use("/api/v1", hostRoutes);
app.use("/api/v1", sessionRoutes);
app.use("/api/v1", analyticsRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", rolesRoutes);

export default app;
