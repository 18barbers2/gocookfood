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

export const validRecipe = {
    title: 'Bacon and Eggs',
    description: 'A classic quick breakfast.',
    imageUrl: 'https://example.com/bacon-and-eggs.jpg',
    steps: [
        'Cook the bacon in a pan over medium heat until crispy, about 8 minutes.',
        'Move the bacon to a plate, leaving some fat in the pan.',
        'Crack the eggs into the pan and cook until the whites are set.',
        'Season with salt and pepper and serve with the bacon.',
    ],
    ingredients: [
        { name: 'bacon', quantity: '4', unit: 'strips' },
        { name: 'eggs', quantity: '2', unit: null },
        { name: 'salt', quantity: null, unit: null },
        { name: 'black pepper', quantity: null, unit: null },
    ],
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

export function createRecipe(token: string, overrides = {}) {
    return request(app)
        .post('/api/recipes')
        .send({ ...validRecipe, ...overrides })
        .set('Authorization', `Bearer ${token}`);
}

export function getRecipe(id: number) {
    return request(app).get(`/api/recipes/${id}`);
}

export function getRecipes() {
    return request(app).get('/api/recipes/');
}
