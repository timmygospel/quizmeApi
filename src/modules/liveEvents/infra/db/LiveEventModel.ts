import mongoose, { Schema, Document } from "mongoose";

export interface IParticipant {
    participantId: string;
    name?: string;
    joinedAt: Date;
}

export interface ILiveEventDocument extends Document {
    eventCode: string;
    name: string;
    quizId: string;
    status: "live" | "ended";
    activeQuestionIndex: number;
    questionVisible: boolean;
    adminToken: string;

    participants: IParticipant[];

    // answers: { [questionIndex]: { [participantId]: optionIndex } }
    answers: Record<string, Record<string, number>>;

    createdAt: Date;
    updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
    {
        participantId: { type: String, required: true },
        name: { type: String, required: false },
        joinedAt: { type: Date, required: true },
    },
    { _id: false }
);

const LiveEventSchema = new Schema<ILiveEventDocument>(
    {
        eventCode: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        quizId: { type: String, required: true },
        status: { type: String, enum: ["live", "ended"], default: "live" },
        activeQuestionIndex: { type: Number, default: 0 },
        questionVisible: { type: Boolean, default: false },
        adminToken: { type: String, required: true },

        participants: { type: [ParticipantSchema], default: [] },
        answers: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

export const LiveEventModel = mongoose.model<ILiveEventDocument>("LiveEvent", LiveEventSchema);
