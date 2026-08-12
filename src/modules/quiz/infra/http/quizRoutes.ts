import express from "express";

import { PgQuizRepository } from "../db/PgQuizRepository";
// ✅ Use Cases

import { CreateQuizUseCase } from "../../application/useCases/createQuiz/CreateQuizUseCase";
import { UpdateQuizUseCase } from "../../application/useCases/updateQuiz/UpdateQuizUseCase";

import { DeleteQuizUseCase } from "../../application/useCases/deleteQuiz/DeleteQuizUseCase";
import { GetQuizUseCase } from "../../application/useCases/getQuiz/GetQuizUseCase";


import { GetAllQuizzesUseCase } from "../../application/useCases/getAllQuizzes/GetAllQuizzesUseCase";
// ✅ Controllers
import { CreateQuizController } from "./controllers/CreateQuizController";
import { UpdateQuizController } from "./controllers/UpdateQuizController";
import { DeleteQuizController } from "./controllers/DeleteQuizController";
import { GetQuizController } from "./controllers/GetQuizController";
import { GetAllQuizzesController } from "./controllers/GetAllQuizzesController";

const router = express.Router();
const repo = new PgQuizRepository();

// Instantiate use cases
const createQuizUseCase = new CreateQuizUseCase(repo);
const updateQuizUseCase = new UpdateQuizUseCase(repo);
const deleteQuizUseCase = new DeleteQuizUseCase(repo);
const getQuizUseCase = new GetQuizUseCase(repo);
const getAllQuizzesUseCase = new GetAllQuizzesUseCase(repo);

// Instantiate controllers
const createQuizController = new CreateQuizController(createQuizUseCase);
const updateQuizController = new UpdateQuizController(updateQuizUseCase);
const deleteQuizController = new DeleteQuizController(deleteQuizUseCase);
const getQuizController = new GetQuizController(getQuizUseCase);
const getAllQuizzesController = new GetAllQuizzesController(getAllQuizzesUseCase);

// ✅ Routes
router.post("/quizzes", (req, res) => createQuizController.execute(req, res));
router.put("/quizzes/:id", (req, res) => updateQuizController.execute(req, res));
router.delete("/quizzes/:id", (req, res) => deleteQuizController.execute(req, res));
router.get("/quizzes/:id", (req, res) => getQuizController.execute(req, res));
router.get("/quizzes", (req, res) => getAllQuizzesController.execute(req, res));

export default router;
