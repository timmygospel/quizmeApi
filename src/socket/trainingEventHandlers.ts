import { Server, Socket } from "socket.io";
import { ITrainingEventNotifier } from "../modules/trainingEvent/domain/ITrainingEventNotifier";
import { normaliseJoinCode } from "../modules/trainingEvent/domain/credentials";

// Training Events (Knowledge Checks): browsers watch an event by its join code and get a nudge when
// it changes; they then refetch over HTTP (which does the real authorisation). Nothing else is sent.
const room = (joinCode: string) => `training-event:${normaliseJoinCode(joinCode)}`;

export function registerTrainingEventHandlers(io: Server): void {
    io.on("connection", (socket: Socket) => {
        socket.on("training-event:watch", (payload: { joinCode?: unknown }) => {
            if (typeof payload?.joinCode !== "string" || !payload.joinCode.trim()) return;
            void socket.join(room(payload.joinCode));
        });
        socket.on("training-event:unwatch", (payload: { joinCode?: unknown }) => {
            if (typeof payload?.joinCode === "string") void socket.leave(room(payload.joinCode));
        });
    });
}

/** Emits through the socket server if it's running (it isn't in unit tests or scripts). */
export function createSocketTrainingEventNotifier(getServer: () => Server): ITrainingEventNotifier {
    const emit = (joinCode: string, event: string) => {
        try {
            getServer().to(room(joinCode)).emit(event, { joinCode: normaliseJoinCode(joinCode) });
        } catch {
            /* socket server not initialised — nothing to notify */
        }
    };
    return {
        checksChanged: (joinCode) => emit(joinCode, "training-event:checks-changed"),
        progress: (joinCode) => emit(joinCode, "training-event:progress"),
    };
}
