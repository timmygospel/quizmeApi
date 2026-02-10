import { MongoQuizRepository } from "../../../infra/db/MongoQuizRepository";
import { CreateQuizUseCase } from "./CreateQuizUseCase";

const quizRepository = new MongoQuizRepository();
const createQuizUseCase = new CreateQuizUseCase(quizRepository);

export { createQuizUseCase };
