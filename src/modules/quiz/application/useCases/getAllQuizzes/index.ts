import { PgQuizRepository } from "../../../infra/db/PgQuizRepository";
import { GetAllQuizzesUseCase } from "./GetAllQuizzesUseCase";

const quizRepository = new PgQuizRepository();
const getAllQuizzesUseCase = new GetAllQuizzesUseCase(quizRepository);

export { getAllQuizzesUseCase };
