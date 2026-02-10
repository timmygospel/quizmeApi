import { Request, Response } from "express";
import { CreateQuizUseCase } from "../../application/useCases/createQuiz/CreateQuizUseCase";
import { UpdateQuizUseCase } from "../../application/useCases/updateQuiz/UpdateQuizUseCase";
import { DeleteQuizUseCase } from "../../application/useCases/deleteQuiz/DeleteQuizUseCase";
import { GetQuizUseCase } from "../../application/useCases/getQuiz/GetQuizUseCase";
import { GetAllQuizzesUseCase } from "../../application/useCases/getAllQuizzes/GetAllQuizzesUseCase";
import { CreateQuizDTO } from "../../application/useCases/createQuiz/CreateQuizUseCase";
import { UpdateQuizDTO } from "../../application/useCases/updateQuiz/UpdateQuizUseCase";

// This class acts as the HTTP adapter for quizzes
export class QuizController {
    constructor(
        private createQuizUseCase: CreateQuizUseCase,
        private updateQuizUseCase: UpdateQuizUseCase,
        private deleteQuizUseCase: DeleteQuizUseCase,
        private getQuizUseCase: GetQuizUseCase,
        private getAllQuizzesUseCase: GetAllQuizzesUseCase
    ) { }

    // POST /api/v1/quizzes
    async createQuiz(req: Request, res: Response) {
        try {
            const dto: CreateQuizDTO = req.body;
            const quiz = await this.createQuizUseCase.execute(dto);
            return res.status(201).json(quiz);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    // GET /api/v1/quizzes
    async getAllQuizzes(req: Request, res: Response) {
        try {
            const quizzes = await this.getAllQuizzesUseCase.execute();
            return res.status(200).json(quizzes);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    // GET /api/v1/quizzes/:id
    async getQuiz(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const quiz = await this.getQuizUseCase.execute(id);
            return res.status(200).json(quiz);
        } catch (error: any) {
            return res.status(404).json({ error: error.message });
        }
    }

    // PUT /api/v1/quizzes/:id
    async updateQuiz(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const dto: UpdateQuizDTO = req.body;
            const updatedQuiz = await this.updateQuizUseCase.execute(id, dto);
            return res.status(200).json(updatedQuiz);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    // DELETE /api/v1/quizzes/:id
    async deleteQuiz(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await this.deleteQuizUseCase.execute(id);
            return res.status(204).send();
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }
}
