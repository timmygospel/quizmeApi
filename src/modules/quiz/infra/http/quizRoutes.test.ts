import express from "express";
import { AddressInfo } from "net";
import { Server } from "http";
import { randomUUID } from "crypto";
import { createQuizRouter } from "./quizRoutes";
import { InMemoryQuizRepository } from "../../testing/InMemoryQuizRepository";
import { IUserRepository, AssignedRoleScope } from "../../../users/domain/IUserRepository";
import { IRoleRepository } from "../../../roles/domain/IRoleRepository";
import { User } from "../../../users/domain/User";
import { UserEmail } from "../../../users/domain/valueObjects/UserEmail";
import { Role } from "../../../roles/domain/Role";

// Each test user has exactly one organisation-wide role; the x-test-user
// header picks which one (no header = unauthenticated).
const ROLES: Record<string, string[]> = {
    editor: ["template.read", "template.create", "template.edit"],
    reader: ["template.read"],
};

function makeUser(id: string): User {
    return new User(
        {
            firstName: "Test",
            lastName: id,
            email: UserEmail.create(`${id}@example.com`).getValue(),
            status: "ACTIVE",
            department: null,
            location: null,
            roles: [],
            lastLoginAt: null,
            invitationSentAt: null,
        },
        id
    );
}

function makeUserRepo(): IUserRepository {
    return {
        findById: jest.fn(),
        findByEmail: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        markInvitationSent: jest.fn(),
        updateStatus: jest.fn(),
        isSoleActiveAdministrator: jest.fn(),
        hasRole: jest.fn(),
        assignRole: jest.fn(),
        removeRole: jest.fn(),
        findEffectiveAccess: jest.fn(async (userId: string): Promise<AssignedRoleScope[]> => [
            { role: { id: `role-${userId}`, code: userId.toUpperCase(), name: userId }, allLocations: true, locations: [], departments: [] },
        ]),
        findByAuthProviderUserId: jest.fn(),
        linkAuthProviderIdentity: jest.fn(),
        touchLastLogin: jest.fn(),
    };
}

function makeRoleRepo(): IRoleRepository {
    return {
        findById: jest.fn(async (id: string) => {
            const key = id.replace("role-", "");
            return new Role(
                { code: key.toUpperCase(), name: key, description: "", type: "SYSTEM", userCount: 1, permissions: ROLES[key] ?? [], archivedAt: null },
                id
            );
        }),
        findByCode: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        archive: jest.fn(),
        setPermissions: jest.fn(),
        findAllPermissions: jest.fn(),
    };
}

describe("quiz routes — sections over HTTP", () => {
    let server: Server;
    let baseUrl: string;
    let repo: InMemoryQuizRepository;

    beforeEach(async () => {
        repo = new InMemoryQuizRepository();
        const app = express();
        app.use(express.json());
        app.use((req, _res, next) => {
            const id = req.header("x-test-user");
            if (id) req.authUser = makeUser(id);
            next();
        });
        app.use("/api/v1", createQuizRouter({ quizRepo: repo, userRepo: makeUserRepo(), roleRepo: makeRoleRepo() }));
        server = app.listen(0);
        await new Promise((resolve) => server.once("listening", resolve));
        baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
    });

    afterEach(async () => {
        await new Promise((resolve) => server.close(resolve));
    });

    const call = (method: string, path: string, user: string | null, body?: unknown): Promise<{ status: number; json(): Promise<any> }> =>
        fetch(`${baseUrl}${path}`, {
            method,
            headers: { "content-type": "application/json", ...(user ? { "x-test-user": user } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body),
        });

    const qid = randomUUID();
    const newQuiz = { title: "Sales Training Day Quiz", questions: [{ id: qid, question: "Warranty?", options: [] }] };

    it("lets a user with template.create/template.edit create sections and assign questions", async () => {
        const created = await call("POST", "/quizzes", "editor", newQuiz);
        expect(created.status).toBe(201);
        const quiz = await created.json();
        expect(quiz.unassignedQuestionIds).toEqual([qid]);

        const sectionId = randomUUID();
        const updated = await call("PUT", `/quizzes/${quiz.id}`, "editor", {
            questions: [{ id: qid, question: "Warranty?", options: [], sectionId }],
            sections: [{ id: sectionId, name: "Product Knowledge" }],
        });
        expect(updated.status).toBe(200);
        const body = await updated.json();
        expect(body.sections).toEqual([{ id: sectionId, name: "Product Knowledge", questionIds: [qid] }]);
        expect(body.questions[0].sectionId).toBe(sectionId);

        const lookup = await call("GET", `/quizzes/${quiz.id}/sections/${sectionId}/questions`, "reader");
        expect(lookup.status).toBe(200);
        const section = await lookup.json();
        expect(section.questions.map((q: { id: string }) => q.id)).toEqual([qid]);
    });

    it("401s section management for an unauthenticated caller", async () => {
        const res = await call("POST", "/quizzes", null, newQuiz);

        expect(res.status).toBe(401);
        expect(repo.quizzes.size).toBe(0);
    });

    it("403s creating or editing sections without template.create/template.edit", async () => {
        const quiz = await (await call("POST", "/quizzes", "editor", newQuiz)).json();

        const create = await call("POST", "/quizzes", "reader", { ...newQuiz, sections: [{ name: "Product Knowledge" }] });
        const edit = await call("PUT", `/quizzes/${quiz.id}`, "reader", { sections: [{ name: "Product Knowledge" }] });

        expect(create.status).toBe(403);
        expect(edit.status).toBe(403);
        expect((await repo.findById(quiz.id))!.sections).toEqual([]);
    });

    it("400s a cross-quiz section assignment", async () => {
        const sales = await (await call("POST", "/quizzes", "editor", newQuiz)).json();
        const service = await (
            await call("POST", "/quizzes", "editor", { title: "Customer Service Quiz", sections: [{ name: "Complaint Handling" }] })
        ).json();
        const foreign = service.sections[0].id;

        const res = await call("PUT", `/quizzes/${sales.id}`, "editor", {
            questions: [{ id: qid, question: "Warranty?", options: [], sectionId: foreign }],
        });

        expect(res.status).toBe(400);
        expect((await res.json()).message).toBe(`Section ${foreign} belongs to another quiz`);
    });

    it("404s updating a quiz that doesn't exist", async () => {
        const res = await call("PUT", `/quizzes/${randomUUID()}`, "editor", { title: "x" });

        expect(res.status).toBe(404);
    });
});
