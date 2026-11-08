import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import prisma from '../src/lib/prisma.js';
import crypto from 'crypto';

// `| undefined` is required because tsconfig has exactOptionalPropertyTypes on,
// and the missing-field tests pass undefined explicitly.
type UserOverrides = {
    email?: string | undefined;
    username?: string | undefined;
    password?: string | undefined;
};

const validUser = {
    email: 'sam@test.com',
    username: 'samtheman',
    password: 'password123',
};

// Registers validUser, with any fields replaced by `overrides`.
function register(overrides: UserOverrides = {}) {
    return request(app)
        .post('/auth/register')
        .send({ ...validUser, ...overrides });
}

async function loginAndGetCookie() {
    await register();
    const login = await request(app).post('/auth/login').send(validUser);
    const cookie = login.headers['set-cookie'];

    if (!cookie) {
        throw new Error('Login did not set a cookie');
    }

    return cookie;
}

describe('POST /auth/register', () => {
    it('registers a user and returns 201', async () => {
        const res = await register();
        expect(res.body.email).toBe(validUser.email);
        expect(res.body.username).toBe(validUser.username);
        expect(res.body.id).toBeDefined();
        expect(res.status).toBe(201);
    });

    it('returns 409 when email is already taken', async () => {
        await register();
        const res = await register({ username: 'anotherusername' });
        expect(res.body.error).toBeDefined();
        expect(res.status).toBe(409);
    });

    it('returns 409 when username is already taken', async () => {
        await register();
        const res = await register({ email: 'differentemail@test.com' });
        expect(res.body.error).toBeDefined();
        expect(res.status).toBe(409);
    });

    it('returns 400 when password is too short', async () => {
        const res = await register({ password: '123' });
        expect(res.body.error).toBeDefined();
        expect(res.status).toBe(400);
    });

    it('returns 400 when the email is missing', async () => {
        const res = await register({ email: undefined });
        expect(res.body.error).toBeDefined();
        expect(res.status).toBe(400);
    });

    it('returns 400 when the username is missing', async () => {
        const res = await register({ username: undefined });
        expect(res.body.error).toBeDefined();
        expect(res.status).toBe(400);
    });

    it('returns 400 when the password is missing', async () => {
        const res = await register({ password: undefined });
        expect(res.body.error).toBeDefined();
        expect(res.status).toBe(400);
    });

    it('does not return the password hash', async () => {
        const res = await register();
        expect(res.status).toBe(201);
        expect(res.body.email).toBe(validUser.email);
        expect(res.body.username).toBe(validUser.username);
        expect(res.body.id).toBeDefined();
        expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('stores a hashed password not plain text', async () => {
        await register();
        const user = await prisma.user.findUnique({ where: { email: validUser.email } });
        expect(user).not.toBeNull();
        expect(user?.passwordHash).not.toEqual(validUser.password);
    });
});

describe('POST /auth/login', () => {
    it('registers a user, logs in and returns status 200', async () => {
        await register();
        const res = await request(app)
            .post('/auth/login')
            .send({ ...validUser });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
    });

    it('returns 401 when the password is incorrect', async () => {
        await register();
        const res = await request(app)
            .post('/auth/login')
            .send({ ...validUser, password: 'wrongpassword123' });
        expect(res.status).toBe(401);
    });

    it('returns 401 when the email is not registered', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ ...validUser, email: 'unknownemail@test.com' });
        expect(res.status).toBe(401);

        // A failed login must not create a session
        expect(res.headers['set-cookie']).toBeUndefined();
    });
});

describe('POST /auth/refresh', () => {
    it('returns 200 and a new access token when the cookie is valid', async () => {
        const cookie = await loginAndGetCookie();

        const res = await request(app).post('/auth/refresh').set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
    });

    it('returns 401 when a refresh token is reused', async () => {
        const cookie = await loginAndGetCookie();

        await request(app).post('/auth/refresh').set('Cookie', cookie);
        const res = await request(app).post('/auth/refresh').set('Cookie', cookie);

        expect(res.status).toBe(401);
    });

    it('sets a new refresh cookie', async () => {
        const loginCookie = await loginAndGetCookie();

        const res = await request(app).post('/auth/refresh').set('Cookie', loginCookie);

        expect(res.status).toBe(200);
        expect(res.headers['set-cookie']).toBeDefined();
    });

    it('replaces the database row', async () => {
        const loginCookie = await loginAndGetCookie();

        await request(app).post('/auth/refresh').set('Cookie', loginCookie);

        const count = await prisma.refreshToken.count();
        expect(count).toBe(1);
    });

    it('returns 401 when there is no cookie', async () => {
        await loginAndGetCookie();

        const res = await request(app).post('/auth/refresh');

        expect(res.status).toBe(401);
    });

    it('returns 401 when the cookie is fake', async () => {
        await loginAndGetCookie();

        const res = await request(app)
            .post('/auth/refresh')
            .set('Cookie', 'refreshToken=thisisnotavalidcookie');

        expect(res.status).toBe(401);
    });

    it('returns 401 when the refresh token is expired', async () => {
        await register();
        const user = await prisma.user.findUnique({ where: { email: validUser.email } });

        const token = 'expiredtoken123';
        await prisma.refreshToken.create({
            data: {
                tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
                userId: user!.id,
                expiresAt: new Date(Date.now() - 1000), // 1 second ago
            },
        });

        const res = await request(app).post('/auth/refresh').set('Cookie', `refreshToken=${token}`);

        expect(res.status).toBe(401);
    });
});

describe('POST /auth/logout', () => {
    it('returns 204 when the user is logged in', async () => {
        const cookie = await loginAndGetCookie();
        const res = await request(app).post('/auth/logout').set('Cookie', cookie);

        expect(res.status).toBe(204);
    });
    it('deletes the refresh token row', async () => {
        const cookie = await loginAndGetCookie();

        // checks that there is 1 refreshToken before logout
        expect(await prisma.refreshToken.count()).toBe(1);

        await request(app).post('/auth/logout').set('Cookie', cookie);

        const count = await prisma.refreshToken.count();

        expect(count).toBe(0);
    });
});
