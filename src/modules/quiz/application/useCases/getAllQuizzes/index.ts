import { PrismaQuizRepository } from "../../../infra/db/PrismaQuizRepository";
import { GetAllQuizzesUseCase } from "./GetAllQuizzesUseCase";

const quizRepository = new PrismaQuizRepository();
const getAllQuizzesUseCase = new GetAllQuizzesUseCase(quizRepository);

export { getAllQuizzesUseCase };
