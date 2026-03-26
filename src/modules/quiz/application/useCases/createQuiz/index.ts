import { PrismaQuizRepository } from "../../../infra/db/PrismaQuizRepository";
import { CreateQuizUseCase } from "./CreateQuizUseCase";

const quizRepository = new PrismaQuizRepository();
const createQuizUseCase = new CreateQuizUseCase(quizRepository);

export { createQuizUseCase };
