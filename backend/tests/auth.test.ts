import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

type UserOverrides = {
    email?: string | undefined;
    username?: string | undefined;
    password?: string | undefined;
};

describe('POST /auth/register', () => {
    const validUser = {
        email: 'sam@test.com',
        username: 'samtheman',
        password: 'password123',
    };

    // Registers a user with the option of override any attribute
    function register(overrides: UserOverrides = {}) {
        return request(app)
            .post('/auth/register')
            .send({ ...validUser, ...overrides });
    }

    it('registers a user and returns 201', async () => {
        const res = await register();
        expect(res.status).toBe(201);
    });

    it('returns 409 when email is already taken', async () => {
        await register();
        const res = await register({ username: 'anotherusername' });
        expect(res.status).toBe(409);
    });

    it('returns 409 when username is already taken', async () => {
        await register();
        const res = await register({ email: 'differentemail@test.com' });
        expect(res.status).toBe(409);
    });

    it('returns 400 when password is too short', async () => {
        const res = await register({ password: '123' });
        expect(res.status).toBe(400);
    });

    it('returns 400 when the email is missing', async () => {
        const res = await register({ email: undefined });
        expect(res.status).toBe(400);
    });

    it('returns 400 when the username is missing', async () => {
        const res = await register({ username: undefined });
        expect(res.status).toBe(400);
    });

    it('returns 400 when the password is missing', async () => {
        const res = await register({ password: undefined });
        expect(res.status).toBe(400);
    });

    it('does not return the password hash', async () => {
        const res = await register();
        expect(res.status).toBe(201);
        expect(res.body).not.toHaveProperty('passwordHash');
    });
});
