import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Mongoose subdocument interfaces
 */
export interface IOptionDocument {
    _id?: Types.ObjectId | string;
    text: string;
    correct: boolean;
}

export interface IQuestionDocument {
    _id?: Types.ObjectId | string;
    question: string;
    options: IOptionDocument[];
}

export interface IQuizDocument extends Document {
    _id?: Types.ObjectId | string;
    title: string;
    questions: IQuestionDocument[];
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Mongoose sub-schemas
 */
const OptionSchema = new Schema<IOptionDocument>(
    {
        text: { type: String, required: true },
        correct: { type: Boolean, required: true },
    },
    { _id: true } // ensure Mongoose creates _id for subdocs
);

const QuestionSchema = new Schema<IQuestionDocument>(
    {
        question: { type: String, required: true },
        options: { type: [OptionSchema], default: [] },
    },
    { _id: true }
);

const QuizSchema = new Schema<IQuizDocument>(
    {
        title: { type: String, required: true },
        questions: { type: [QuestionSchema], default: [] },
    },
    { timestamps: true }
);

/**
 * Mongoose model
 */
export const QuizModel = mongoose.model<IQuizDocument>("Quiz", QuizSchema);
