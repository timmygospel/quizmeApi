import { PrismaQuizRepository } from "../../../infra/db/PrismaQuizRepository";
import { DeleteQuizUseCase } from "./DeleteQuizUseCase";

const quizRepository = new PrismaQuizRepository();
const deleteQuizUseCase = new DeleteQuizUseCase(quizRepository);

export { deleteQuizUseCase };
