import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('POST /auth/register', () => {
    it('registers a user and returns 201', async () => {
        const res = await request(app).post('/auth/register').send({
            email: 'samrocks123321@gmail.com',
            username: 'samrocks101',
            password: 'password123',
        });
        expect(res.status).toBe(201);
    });

    it('returns 400 because duplicate email', async () => {
        await request(app).post('/auth/register').send({
            email: 'samrocks123321@gmail.com',
            username: 'samrocks101',
            password: 'password123',
        });

        const res = await request(app).post('/auth/register').send({
            email: 'samrocks123321@gmail.com',
            username: 'samrocks',
            password: 'password123',
        });
        expect(res.status).toBe(409);
    });
});
