import { PrismaQuizRepository } from "../../../infra/db/PrismaQuizRepository";
import { UpdateQuizUseCase } from "./UpdateQuizUseCase";

const quizRepository = new PrismaQuizRepository();
const updateQuizUseCase = new UpdateQuizUseCase(quizRepository);

export { updateQuizUseCase };
