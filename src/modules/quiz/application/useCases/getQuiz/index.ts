import { MongoQuizRepository } from "../../../infra/db/MongoQuizRepository";
import { GetQuizUseCase } from "./GetQuizUseCase";

const quizRepository = new MongoQuizRepository();
const getQuizUseCase = new GetQuizUseCase(quizRepository);

export { getQuizUseCase };
