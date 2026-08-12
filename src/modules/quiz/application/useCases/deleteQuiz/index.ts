import { PgQuizRepository } from "../../../infra/db/PgQuizRepository";
import { DeleteQuizUseCase } from "./DeleteQuizUseCase";

const quizRepository = new PgQuizRepository();
const deleteQuizUseCase = new DeleteQuizUseCase(quizRepository);

export { deleteQuizUseCase };
