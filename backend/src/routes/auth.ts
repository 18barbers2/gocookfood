import argon2 from 'argon2';
import prisma from '../lib/prisma.js';
import { Router, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/config.js';
import crypto from 'crypto';

const router = Router();

// Created once when the file loads, a hash of a throwaway password.
// Used so failed logins take the same time whether or not the email exists.
const DUMMY_HASH = await argon2.hash('dummy-password-for-timing');

// Create once for the refresh token
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function issueTokens(res: Response, userId: number): Promise<string> {
    const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.refreshToken.create({
        data: {
            tokenHash,
            userId,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS), // 7 days,
        },
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: REFRESH_TOKEN_TTL_MS,
        path: '/auth',
    });

    return accessToken;
}

function clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refreshToken', { path: '/auth' });
}

router.post('/register', async (req, res) => {
    const email = req.body.email;
    const username = req.body.username;
    const password = req.body.password;

    if (!email || !username || !password) {
        return res.status(400).json({ error: 'Please complete all required fields' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password too short' });
    }

    try {
        // If email or user already exists return 409 status
        if (
            await prisma.user.findFirst({
                where: {
                    OR: [{ email }, { username }],
                },
            })
        ) {
            return res.status(409).json({ error: 'Email or username already taken' });
        }

        // use argon2 to hash the password
        const passwordHash = await argon2.hash(password);
        const created = await prisma.user.create({
            data: {
                email,
                username,
                passwordHash,
            },
            select: {
                id: true,
                email: true,
                username: true,
                createdAt: true,
            },
        });

        return res.status(201).json(created);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Unable to create user' });
    }
});

router.post('/login', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email or password missing' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        // Always run verify, against the dummy hash when there's no user
        const valid = await argon2.verify(user?.passwordHash ?? DUMMY_HASH, password);

        if (!user || !valid) {
            return res.status(401).json({ error: 'Incorrect email or password' });
        }

        const accessToken = await issueTokens(res, user.id);
        return res.status(200).json({ accessToken });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const result = await prisma.refreshToken.findUnique({
            where: {
                tokenHash,
            },
        });

        if (!result) {
            // if cookie doesnt exist in db then clear it
            clearRefreshTokenCookie(res);
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        if (result.expiresAt < new Date()) {
            // if expired, delete it, clear the cookie, and return 401
            await prisma.refreshToken.delete({ where: { tokenHash } });
            clearRefreshTokenCookie(res);
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        // each refreshToken works only once
        const { count } = await prisma.refreshToken.deleteMany({ where: { id: result.id } });
        if (count === 0) {
            // Another request already used this token, race condition
            clearRefreshTokenCookie(res);
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        const accessToken = await issueTokens(res, result.userId);

        return res.status(200).json({ accessToken });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            await prisma.refreshToken.deleteMany({ where: { tokenHash } });
        }

        clearRefreshTokenCookie(res);
        return res.sendStatus(204);
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
