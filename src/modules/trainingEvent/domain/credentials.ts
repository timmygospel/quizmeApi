import { createHash, randomBytes, randomInt } from "crypto";

// The attendee token is the only thing that identifies a guest's browser. It is 256 random bits,
// handed to the browser once, and only its SHA-256 hash is stored — a database leak can't be replayed.
export function newAttendeeToken(): string {
    return randomBytes(32).toString("base64url");
}

export function hashAttendeeToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

// Join codes are read off a projector and typed on phones: no 0/O, 1/I/L.
const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;

export function newJoinCode(): string {
    let code = "";
    for (let i = 0; i < JOIN_CODE_LENGTH; i++) code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
    return code;
}

/** Normalises what someone typed or scanned (case, spaces) to the stored form. */
export function normaliseJoinCode(raw: string): string {
    return raw.replace(/\s+/g, "").toUpperCase();
}
