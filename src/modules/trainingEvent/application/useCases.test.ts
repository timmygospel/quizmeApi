import { ITrainingEventRepository } from "../domain/ITrainingEventRepository";
import { Attendee, KnowledgeCheck, TrainingEvent } from "../domain/TrainingEvent";
import { hashAttendeeToken } from "../domain/credentials";
import { IQuizRepository } from "../../quiz/domain/IQuizRepository";
import { Quiz } from "../../quiz/domain/Quiz";
import { QuizTitle } from "../../quiz/domain/valueObjects/QuizTitle";
import { Question } from "../../quiz/domain/Question";
import { QuestionText } from "../../quiz/domain/valueObjects/QuestionText";
import { Option } from "../../quiz/domain/Option";
import { OptionText } from "../../quiz/domain/valueObjects/OptionText";
import { EffectiveScope } from "../../../shared/core/EffectiveScope";
import {
    CloseCheckUseCase,
    CreateTrainingEventUseCase,
    GetTrainingEventUseCase,
    MergeAttendeesUseCase,
    OpenCheckUseCase,
} from "./trainerUseCases";
import {
    GetCurrentActivityUseCase,
    JoinAsGuestUseCase,
    JoinAsSignedInUserUseCase,
    GetEventForAttendeeUseCase,
    ListGuestsUseCase,
    RejoinAsGuestUseCase,
    SaveCheckAnswerUseCase,
    SubmitCheckUseCase,
} from "./attendeeUseCases";

jest.mock("../../../shared/infra/audit/recordAuditEvent", () => ({ recordAuditEvent: jest.fn() }));

const EVENT: TrainingEvent = {
    id: "ev-1", name: "Sales Training Day", quizId: "quiz-1", ownerId: "trainer-1", joinCode: "K7M9QX",
    eventDate: "2026-10-01", status: "OPEN", createdAt: new Date(), endedAt: null,
};
const CHECK: KnowledgeCheck = {
    id: "chk-1", trainingEventId: "ev-1", quizSectionId: "sec-1", name: "Product Knowledge", position: 0,
    status: "OPEN", openedAt: new Date(), closedAt: null,
};
const guest = (id: string, over: Partial<Attendee> = {}): Attendee => ({
    id, trainingEventId: "ev-1", displayName: `Guest ${id}`, userId: null, mergedIntoId: null, createdAt: new Date(), ...over,
});
const QUESTIONS = [
    { id: "cq-1", checkId: "chk-1", position: 0, question: "Warranty?", options: [{ text: "1 year", correct: true }, { text: "None", correct: false }] },
    { id: "cq-2", checkId: "chk-1", position: 1, question: "Returns?", options: [{ text: "30 days", correct: true }, { text: "Never", correct: false }] },
];

function makeRepo(over: Partial<ITrainingEventRepository> = {}): ITrainingEventRepository {
    return {
        create: jest.fn().mockImplementation(async (e) => ({ ...EVENT, ...e, id: "ev-new" })),
        joinCodeExists: jest.fn().mockResolvedValue(false),
        findById: jest.fn().mockResolvedValue(EVENT),
        findByJoinCode: jest.fn().mockResolvedValue(EVENT),
        list: jest.fn().mockResolvedValue([EVENT]),
        endEvent: jest.fn(),
        findChecks: jest.fn().mockResolvedValue([CHECK]),
        findCheck: jest.fn().mockResolvedValue(CHECK),
        openCheck: jest.fn(),
        closeCheck: jest.fn(),
        hasSnapshot: jest.fn().mockResolvedValue(false),
        findCheckQuestions: jest.fn().mockResolvedValue(QUESTIONS),
        countSubmissions: jest.fn().mockResolvedValue({}),
        createAttendee: jest.fn().mockImplementation(async (_e, name, userId) => guest("new", { displayName: name, userId })),
        findAttendee: jest.fn().mockResolvedValue(guest("g1")),
        findOrCreateUserAttendee: jest.fn().mockImplementation(async (_e, userId, name) => ({
            attendee: guest("emp", { userId, displayName: name }), created: true,
        })),
        listGuests: jest.fn().mockResolvedValue([guest("g1")]),
        countAttendees: jest.fn().mockResolvedValue(1),
        addToken: jest.fn(),
        findAttendeeByTokenHash: jest.fn().mockResolvedValue(guest("g1")),
        touchAttendee: jest.fn(),
        mergeAttendees: jest.fn(),
        findAttempt: jest.fn().mockResolvedValue(null),
        findAttemptsForAttendee: jest.fn().mockResolvedValue([]),
        saveResponse: jest.fn(),
        findResponses: jest.fn().mockResolvedValue([]),
        submitAttempt: jest.fn().mockImplementation(async (checkId, attendeeId, score) => ({
            id: "att-1", checkId, attendeeId, startedAt: new Date(), submittedAt: new Date(), scorePercentage: score,
        })),
        getResults: jest.fn().mockResolvedValue([]),
        ...over,
    };
}

function quizWithSections(sections: { id: string; name: string; questionIds: string[] }[]): IQuizRepository {
    const q = (id: string, text: string) => new Question({
        id, question: QuestionText.create(text).getValue(),
        options: [new Option({ text: OptionText.create("Yes").getValue(), correct: true }), new Option({ text: OptionText.create("No").getValue(), correct: false })],
    });
    const quiz = new Quiz({ id: "quiz-1", title: QuizTitle.create("Sales").getValue(), questions: [q("q1", "First?"), q("q2", "Second?")], sections });
    return { findById: jest.fn().mockResolvedValue(quiz) } as unknown as IQuizRepository;
}

const trainerScope = { type: "SCOPED", userId: "trainer-1", locationIds: [], departmentIds: [], allLocations: false } as EffectiveScope;

describe("trainer", () => {
    it("creates one Knowledge Check per section that has questions, in order", async () => {
        const repo = makeRepo();
        const quizRepo = quizWithSections([
            { id: "s1", name: "Product Knowledge", questionIds: ["q1"] },
            { id: "s2", name: "Empty", questionIds: [] },
            { id: "s3", name: "Objections", questionIds: ["q2"] },
        ]);
        const result = await new CreateTrainingEventUseCase(repo, quizRepo).execute({ name: " Sales Day ", quizId: "quiz-1" }, "trainer-1");

        expect(result.isSuccess).toBe(true);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Sales Day", ownerId: "trainer-1", joinCode: expect.stringMatching(/^[A-Z2-9]{6}$/) }),
            [{ quizSectionId: "s1", name: "Product Knowledge", position: 0 }, { quizSectionId: "s3", name: "Objections", position: 1 }]
        );
    });

    it("explains when the quiz has no sections to become checks", async () => {
        const result = await new CreateTrainingEventUseCase(makeRepo(), quizWithSections([])).execute({ name: "Day", quizId: "quiz-1" }, "trainer-1");
        expect(result.errorValue()).toMatch(/Each section becomes a Knowledge Check/);
    });

    it("another trainer's event is not found", async () => {
        const result = await new GetTrainingEventUseCase(makeRepo()).execute("ev-1", "someone-else", { ...trainerScope, userId: "someone-else" });
        expect(result.errorValue()).toMatch(/^NOT_FOUND/);
    });

    it("opening a check copies the section's questions the first time", async () => {
        const repo = makeRepo({ findCheck: jest.fn().mockResolvedValue({ ...CHECK, status: "PENDING" }) });
        const quizRepo = quizWithSections([{ id: "sec-1", name: "Product Knowledge", questionIds: ["q2", "q1"] }]);
        await new OpenCheckUseCase(repo, quizRepo).execute("ev-1", "chk-1", "trainer-1", trainerScope);

        expect(repo.openCheck).toHaveBeenCalledWith("chk-1", [
            { sourceQuestionId: "q2", question: "Second?", options: [{ text: "Yes", correct: true }, { text: "No", correct: false }] },
            { sourceQuestionId: "q1", question: "First?", options: [{ text: "Yes", correct: true }, { text: "No", correct: false }] },
        ], expect.any(Date));
    });

    it("only a guest can be merged into someone else", async () => {
        const repo = makeRepo({
            findAttendee: jest.fn().mockImplementation(async (id: string) => guest(id, id === "signed-in" ? { userId: "u1" } : {})),
        });
        const result = await new MergeAttendeesUseCase(repo).execute("ev-1", "signed-in", "g1", "trainer-1", trainerScope);
        expect(result.errorValue()).toMatch(/Only a guest/);
        expect(repo.mergeAttendees).not.toHaveBeenCalled();
    });
});

describe("attendee", () => {
    it("joining gives the browser a token and stores only its hash", async () => {
        const repo = makeRepo();
        const result = await new JoinAsGuestUseCase(repo).execute("k7m9qx", "  Jo Smith ");
        const { token, attendee } = result.getValue();
        expect(attendee.displayName).toBe("Jo Smith");
        expect(repo.addToken).toHaveBeenCalledWith("new", hashAttendeeToken(token));
        expect(repo.findByJoinCode).toHaveBeenCalledWith("K7M9QX");
    });

    it("can't join an event that has ended", async () => {
        const repo = makeRepo({ findByJoinCode: jest.fn().mockResolvedValue({ ...EVENT, status: "ENDED" }) });
        expect((await new JoinAsGuestUseCase(repo).execute("K7M9QX", "Jo")).errorValue()).toMatch(/^CONFLICT/);
    });

    it("a token issued for another event doesn't work here", async () => {
        const repo = makeRepo({ findAttendeeByTokenHash: jest.fn().mockResolvedValue(guest("g1", { trainingEventId: "other-event" })) });
        const result = await new GetCurrentActivityUseCase(repo).execute("K7M9QX", "some-token");
        expect(result.errorValue()).toMatch(/^UNAUTHORIZED/);
    });

    it("the guest list never includes signed-in attendees (the repository filters; the use case passes it through)", async () => {
        const repo = makeRepo();
        await new ListGuestsUseCase(repo).execute("K7M9QX");
        expect(repo.listGuests).toHaveBeenCalledWith("ev-1");
    });

    it("rejoining by name only works for guests", async () => {
        const repo = makeRepo({ findAttendee: jest.fn().mockResolvedValue(guest("emp", { userId: "u1" })) });
        const result = await new RejoinAsGuestUseCase(repo).execute("K7M9QX", "emp");
        expect(result.errorValue()).toMatch(/^NOT_FOUND/);
        expect(repo.addToken).not.toHaveBeenCalled();
    });

    it("the open check never reveals correct answers before submitting", async () => {
        const result = await new GetCurrentActivityUseCase(makeRepo()).execute("K7M9QX", "tok");
        const open = result.getValue().openCheck!;
        expect(open.questions[0]).toEqual({ id: "cq-1", question: "Warranty?", options: ["1 year", "None"] });
        expect(open.result).toBeNull();
    });

    it("saves an answer, working out if it's correct from the snapshot", async () => {
        const repo = makeRepo();
        await new SaveCheckAnswerUseCase(repo).execute("K7M9QX", "tok", "chk-1", "cq-2", 1);
        expect(repo.saveResponse).toHaveBeenCalledWith("chk-1", "g1", { checkQuestionId: "cq-2", optionIndex: 1, isCorrect: false });
    });

    it("won't take answers for a closed check or after submitting", async () => {
        const closed = makeRepo({ findCheck: jest.fn().mockResolvedValue({ ...CHECK, status: "CLOSED" }) });
        expect((await new SaveCheckAnswerUseCase(closed).execute("K7M9QX", "tok", "chk-1", "cq-1", 0)).errorValue()).toMatch(/closed/);
        const done = makeRepo({ findAttempt: jest.fn().mockResolvedValue({ submittedAt: new Date() }) });
        expect((await new SubmitCheckUseCase(done).execute("K7M9QX", "tok", "chk-1")).errorValue()).toMatch(/already submitted/);
    });

    it("submitting scores unanswered as wrong and returns the correct answers", async () => {
        const repo = makeRepo({ findResponses: jest.fn().mockResolvedValue([{ checkQuestionId: "cq-1", optionIndex: 0, isCorrect: true }]) });
        const result = (await new SubmitCheckUseCase(repo).execute("K7M9QX", "tok", "chk-1")).getValue();
        expect(result.scorePercentage).toBe(50);
        expect(result.review.map((r) => [r.questionId, r.selectedIndex, r.isCorrect])).toEqual([["cq-1", 0, true], ["cq-2", null, false]]);
        expect(result.review[1].options).toEqual([{ text: "30 days", correct: true }, { text: "Never", correct: false }]);
    });
});

describe("live nudges", () => {
    const notifier = () => ({ checksChanged: jest.fn(), progress: jest.fn() });

    it("opening and closing a check tell attendees; failures and no-ops don't", async () => {
        const n = notifier();
        const pending = makeRepo({ findCheck: jest.fn().mockResolvedValue({ ...CHECK, status: "PENDING" }) });
        const quizRepo = quizWithSections([{ id: "sec-1", name: "Product Knowledge", questionIds: ["q1"] }]);
        await new OpenCheckUseCase(pending, quizRepo, n).execute("ev-1", "chk-1", "trainer-1", trainerScope);
        await new CloseCheckUseCase(makeRepo(), n).execute("ev-1", "chk-1", "trainer-1", trainerScope);
        expect(n.checksChanged).toHaveBeenCalledTimes(2);
        expect(n.checksChanged).toHaveBeenCalledWith("K7M9QX");

        const quiet = notifier();
        await new OpenCheckUseCase(makeRepo(), quizRepo, quiet).execute("ev-1", "chk-1", "trainer-1", trainerScope); // already open
        await new CloseCheckUseCase(makeRepo(), quiet).execute("ev-1", "chk-1", "someone-else", { ...trainerScope, userId: "someone-else" });
        expect(quiet.checksChanged).not.toHaveBeenCalled();
    });

    it("joining and submitting tell the trainer", async () => {
        const n = notifier();
        await new JoinAsGuestUseCase(makeRepo(), n).execute("K7M9QX", "Jo");
        await new SubmitCheckUseCase(makeRepo(), n).execute("K7M9QX", "tok", "chk-1");
        expect(n.progress).toHaveBeenCalledTimes(2);
        expect(n.checksChanged).not.toHaveBeenCalled();
    });
});

describe("signed-in employees", () => {
    const TIM = { id: "u1", displayName: "Tim Morrison" };

    it("join as themselves with no name to type, and get a token like a guest", async () => {
        const repo = makeRepo();
        const result = (await new JoinAsSignedInUserUseCase(repo).execute("k7m9qx", TIM)).getValue();
        expect(repo.findOrCreateUserAttendee).toHaveBeenCalledWith("ev-1", "u1", "Tim Morrison");
        expect(result.attendee).toEqual({ id: "emp", displayName: "Tim Morrison", isGuest: false });
        expect(repo.addToken).toHaveBeenCalledWith("emp", hashAttendeeToken(result.token));
    });

    it("joining again (new device) reuses their record and doesn't nudge the trainer", async () => {
        const n = { checksChanged: jest.fn(), progress: jest.fn() };
        const repo = makeRepo({
            findOrCreateUserAttendee: jest.fn().mockResolvedValue({ attendee: guest("emp", { userId: "u1" }), created: false }),
        });
        await new JoinAsSignedInUserUseCase(repo, n).execute("K7M9QX", TIM);
        expect(n.progress).not.toHaveBeenCalled();
        await new JoinAsSignedInUserUseCase(makeRepo(), n).execute("K7M9QX", TIM);
        expect(n.progress).toHaveBeenCalledTimes(1);
    });

    it("can't join an ended event", async () => {
        const repo = makeRepo({ findByJoinCode: jest.fn().mockResolvedValue({ ...EVENT, status: "ENDED" }) });
        expect((await new JoinAsSignedInUserUseCase(repo).execute("K7M9QX", TIM)).errorValue()).toMatch(/^CONFLICT/);
    });

    it("the event page says who is signed in", async () => {
        const result = (await new GetEventForAttendeeUseCase(makeRepo()).execute("K7M9QX", undefined, TIM)).getValue();
        expect(result.signedInAs).toBe("Tim Morrison");
        expect(result.attendee).toBeNull();
    });

    it("on a shared device, another employee's token isn't honoured for whoever is signed in now", async () => {
        const repo = makeRepo({ findAttendeeByTokenHash: jest.fn().mockResolvedValue(guest("emp", { userId: "someone-else" })) });
        const asTim = await new GetCurrentActivityUseCase(repo).execute("K7M9QX", "tok", TIM);
        expect(asTim.errorValue()).toMatch(/^UNAUTHORIZED/);
        const signedOut = await new GetCurrentActivityUseCase(repo).execute("K7M9QX", "tok", null);
        expect(signedOut.isSuccess).toBe(true);
    });

    it("a guest token keeps working after the person signs in", async () => {
        const result = await new GetCurrentActivityUseCase(makeRepo()).execute("K7M9QX", "tok", TIM);
        expect(result.getValue().attendee.isGuest).toBe(true);
    });
});
