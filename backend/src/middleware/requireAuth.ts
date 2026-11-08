import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/config.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);

        if (typeof payload === 'string' || typeof payload.userId !== 'number') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        req.user = { id: payload.userId };
        next();
    } catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
