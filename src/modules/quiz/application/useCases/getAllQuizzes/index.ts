import { MongoQuizRepository } from "../../../infra/db/MongoQuizRepository";
import { GetAllQuizzesUseCase } from "./GetAllQuizzesUseCase";

const quizRepository = new MongoQuizRepository();
const getAllQuizzesUseCase = new GetAllQuizzesUseCase(quizRepository);

export { getAllQuizzesUseCase };
