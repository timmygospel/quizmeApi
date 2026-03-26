/**
 * authMiddleware
 *
 * Reads an optional `Authorization: Bearer <token>` header, verifies the JWT,
 * and attaches the decoded payload to `req.user`.
 *
 * Routes that call this middleware but receive an invalid / missing token will
 * have `req.user = null`. Use `requireRole` after this middleware to enforce
 * access control.
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
    userId: string;
    email: string;
    role: "ADMIN" | "TRAINER" | "PARTICIPANT";
    orgId?: string;
}

declare global {
    namespace Express {
        interface Request {
            user: AuthUser | null;
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-set-JWT_SECRET-in-env";

export function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    req.user = null;

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return next();
    }

    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
        req.user = payload;
    } catch {
        // Invalid or expired token — treat as unauthenticated
    }

    next();
}
