import { PgQuizRepository } from "../../../infra/db/PgQuizRepository";
import { GetQuizUseCase } from "./GetQuizUseCase";

const quizRepository = new PgQuizRepository();
const getQuizUseCase = new GetQuizUseCase(quizRepository);

export { getQuizUseCase };
