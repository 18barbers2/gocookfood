import argon2 from 'argon2';
import prisma from '../lib/prisma.js';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/config.js';
import crypto from 'crypto';

const router = Router();

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

    try {
        const created = await prisma.user.create({
            data: {
                email: email,
                username: username,
                passwordHash: passwordHash,
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
        return res.status(500).json({ error: 'Unable to create user' });
    }
});

router.post('/login', async (req, res) => {
    const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email or password missing' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (user && (await argon2.verify(user.passwordHash, password))) {
            // create access token with jwt.sign
            const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });

            // create refresh token
            const refreshToken = crypto.randomBytes(32).toString('hex');

            // hash refreshToken
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

            // create refreshToken in datbase with tokenHash
            await prisma.refreshToken.create({
                data: {
                    tokenHash,
                    userId: user.id,
                    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS), // 7 days,
                },
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: REFRESH_TOKEN_TTL_MS,
            });

            return res.status(200).json({ accessToken });
        }
        return res.status(401).json({ error: 'Incorrect email or password' });
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
