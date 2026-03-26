import { PrismaQuizRepository } from "../../../infra/db/PrismaQuizRepository";
import { GetQuizUseCase } from "./GetQuizUseCase";

const quizRepository = new PrismaQuizRepository();
const getQuizUseCase = new GetQuizUseCase(quizRepository);

export { getQuizUseCase };
