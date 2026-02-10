import { Router } from "express";
import { v4 as uuid } from "uuid";

const router = Router();

// In-memory store (swap later for DB/repo)
const categories: { id: string; name: string }[] = [];

router.get("/categories", (_req, res) => {
    res.json(categories);
});

router.post("/categories", (req, res) => {
    const name = String(req.body?.name ?? "").trim();
    if (!name) return res.status(400).json({ message: "name is required" });

    const exists = categories.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) return res.status(409).json({ message: "category already exists" });

    const created = { id: uuid(), name };
    categories.push(created);
    res.status(201).json(created);
});

router.put("/categories/:id", (req, res) => {
    const { id } = req.params;
    const name = String(req.body?.name ?? "").trim();
    if (!name) return res.status(400).json({ message: "name is required" });

    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) return res.status(404).json({ message: "category not found" });

    categories[idx] = { ...categories[idx], name };
    res.json(categories[idx]);
});

router.delete("/categories/:id", (req, res) => {
    const { id } = req.params;
    const before = categories.length;
    const next = categories.filter((c) => c.id !== id);
    if (next.length === before) return res.status(404).json({ message: "category not found" });

    categories.length = 0;
    categories.push(...next);
    res.status(204).send();
});

export default router;
