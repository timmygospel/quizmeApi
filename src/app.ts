import express from "express";
import quizRoutes from "./modules/quiz/infra/http/quizRoutes";
import categoryRoutes from "./modules/quiz/infra/http/categoryRoutes";
import questionBankRoutes from "./modules/quiz/infra/http/questionBankRoutes";
import liveEventRoutes from "./modules/liveEvents/infra/http/liveEventRoutes"
import cors from "cors";
const app = express();
app.use(express.json());

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use("/api/v1", quizRoutes);
app.use("/api/v1", categoryRoutes);
app.use("/api/v1", questionBankRoutes);
app.use("/api/v1", liveEventRoutes)
export default app;
