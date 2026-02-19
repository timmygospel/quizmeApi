import { v4 as uuid } from "uuid";
import { Router, Request, Response } from "express";


type Option = { text: string; correct: boolean };
type BankQuestion = {
    id: string;
    question: string;
    options: Option[];
    categoryId?: string;
};

const router = Router();
const questionBank: BankQuestion[] = [];

type ValidateFail = { ok: false; message: string };
type ValidateOk = { ok: true; value: Omit<BankQuestion, "id"> };
type ValidateResult = ValidateFail | ValidateOk;

const validateQuestion = (body: any): ValidateResult => {
    const question = String(body?.question ?? "").trim();
    const optionsRaw = Array.isArray(body?.options) ? body.options : [];

    if (!question) return { ok: false, message: "question is required" };
    if (optionsRaw.length < 2) return { ok: false, message: "at least 2 options required" };

    const cleaned: Option[] = optionsRaw.map((o: any) => ({
        text: String(o?.text ?? "").trim(),
        correct: Boolean(o?.correct),
    }));

    if (cleaned.some((o) => !o.text)) return { ok: false, message: "all options must have text" };
    if (!cleaned.some((o) => o.correct)) return { ok: false, message: "one option must be correct" };
    if (cleaned.filter((o) => o.correct).length !== 1)
        return { ok: false, message: "only one option can be correct" };

    const categoryIdRaw = body?.categoryId;
    const categoryId = categoryIdRaw ? String(categoryIdRaw) : undefined;

    return { ok: true, value: { question, options: cleaned, categoryId } };
};


router.get("/question-bank", (req: Request, res: Response) => {
    const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined;

    const result = categoryId
        ? questionBank.filter((q) => q.categoryId === categoryId)
        : questionBank;

    res.json(result);
});

router.post("/question-bank", (req: Request, res: Response) => {
    const parsed = validateQuestion(req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });

    const created: BankQuestion = { id: uuid(), ...parsed.value };
    questionBank.push(created);
    res.status(201).json(created);
});

router.put("/question-bank/:id", (req: Request, res: Response) => {
    const { id } = req.params;

    const idx = questionBank.findIndex((q) => q.id === id);
    if (idx === -1) return res.status(404).json({ message: "question not found" });

    const parsed = validateQuestion(req.body);
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });

    questionBank[idx] = { ...questionBank[idx], ...parsed.value, id };
    res.json(questionBank[idx]);
});

router.delete("/question-bank/:id", (req: Request, res: Response) => {
    const { id } = req.params;

    const before = questionBank.length;
    const next = questionBank.filter((q) => q.id !== id);
    if (next.length === before) return res.status(404).json({ message: "question not found" });

    questionBank.length = 0;
    questionBank.push(...next);
    res.status(204).send();
});

export default router;
