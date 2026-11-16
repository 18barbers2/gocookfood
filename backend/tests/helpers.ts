import request from 'supertest';
import { app } from '../src/app.js';

// `| undefined` is required because tsconfig has exactOptionalPropertyTypes on,
// and the missing-field tests pass undefined explicitly.
type UserOverrides = {
    email?: string | undefined;
    username?: string | undefined;
    password?: string | undefined;
};

export const validUser = {
    email: 'sam@test.com',
    username: 'samtheman',
    password: 'password123',
};

// Registers validUser, with any fields replaced by `overrides`.
export function register(overrides: UserOverrides = {}) {
    return request(app)
        .post('/api/auth/register')
        .send({ ...validUser, ...overrides });
}

export async function loginAndGetCookie() {
    await register();
    const login = await request(app).post('/api/auth/login').send(validUser);
    const cookie = login.headers['set-cookie'];

    if (!cookie) {
        throw new Error('Login did not set a cookie');
    }

    return cookie;
}

export async function loginAndGetAccessToken() {
    await register();
    const login = await request(app).post('/api/auth/login').send(validUser);
    const token = login.body.accessToken;
    return token;
}
