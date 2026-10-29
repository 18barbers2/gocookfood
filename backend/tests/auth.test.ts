import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('POST /register', () => {
    it('registers a user', async () => {
        const res = await request(app).post('/auth/register').send({
            email: 'samrocks123321@gmail.com',
            username: 'samrocks101',
            password: 'password123',
        });
        expect(res.status).toBe(201);
    });
});
