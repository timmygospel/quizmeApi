import { Router } from "express";
import { v4 as uuid } from "uuid";

type Option = { text: string; correct: boolean };
type BankQuestion = {
    id: string;
    question: string;
    options: Option[];
    categoryId?: string;
};

const router = Router();
const questionBank: BankQuestion[] = [];

const validateQuestion = (body: any) => {
    const question = String(body?.question ?? "").trim();
    const options = Array.isArray(body?.options) ? body.options : [];

    if (!question) return { ok: false, message: "question is required" };
    if (options.length < 2) return { ok: false, message: "at least 2 options required" };

    const cleaned: Option[] = options.map((o: any) => ({
        text: String(o?.text ?? "").trim(),
        correct: !!o?.correct,
    }));

    if (cleaned.some((o) => !o.text)) return { ok: false, message: "all options must have text" };
    if (!cleaned.some((o) => o.correct)) return { ok: false, message: "one option must be correct" };
    if (cleaned.filter((o) => o.correct).length !== 1)
        return { ok: false, message: "only one option can be correct" };

    const categoryIdRaw = body?.categoryId;
    const categoryId = categoryIdRaw ? String(categoryIdRaw) : undefined;

    return { ok: true, value: { question, options: cleaned, categoryId } as Omit<BankQuestion, "id"> };
};

router.get("/question-bank", (req, res) => {
    const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined;

    const result = categoryId
        ? questionBank.filter((q) => q.categoryId === categoryId)
        : questionBank;

    res.json(result);
});

router.post("/question-bank", (req, res) => {
    const parsed = validateQuestion(req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });

    const created: BankQuestion = { id: uuid(), ...parsed.value };
    questionBank.push(created);
    res.status(201).json(created);
});

router.put("/question-bank/:id", (req, res) => {
    const { id } = req.params;

    const idx = questionBank.findIndex((q) => q.id === id);
    if (idx === -1) return res.status(404).json({ message: "question not found" });

    const parsed = validateQuestion(req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });

    questionBank[idx] = { ...questionBank[idx], ...parsed.value, id };
    res.json(questionBank[idx]);
});

router.delete("/question-bank/:id", (req, res) => {
    const { id } = req.params;

    const before = questionBank.length;
    const next = questionBank.filter((q) => q.id !== id);
    if (next.length === before) return res.status(404).json({ message: "question not found" });

    questionBank.length = 0;
    questionBank.push(...next);
    res.status(204).send();
});

export default router;
