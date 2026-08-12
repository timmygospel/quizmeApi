import { PgQuizRepository } from "../../../infra/db/PgQuizRepository";
import { CreateQuizUseCase } from "./CreateQuizUseCase";

const quizRepository = new PgQuizRepository();
const createQuizUseCase = new CreateQuizUseCase(quizRepository);

export { createQuizUseCase };
