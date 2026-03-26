/**
 * requireRole
 *
 * Factory that returns an Express middleware enforcing that the authenticated
 * user has one of the specified roles.
 *
 * Must be used after `authMiddleware`.
 *
 * Usage:
 *   router.get('/sensitive', authMiddleware, requireRole('ADMIN', 'TRAINER'), handler)
 */

import { Request, Response, NextFunction } from "express";
import { AuthUser } from "./authMiddleware";

export function requireRole(...roles: AuthUser["role"][]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ message: "Insufficient permissions" });
            return;
        }
        next();
    };
}
