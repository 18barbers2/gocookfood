import { describe, it, expect } from 'vitest';
import prisma from '../src/lib/prisma.js';
import { validUser, loginAndGetAccessToken, validRecipe, createRecipe } from './helpers.js';
import request from 'supertest';
import { app } from '../src/app.js';

describe('POST /api/recipes', () => {
    it('returns 201 when recipe is created', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token);
        expect(res.status).toBe(201);
        expect(await prisma.ingredient.count()).toBe(4);
    });

    it('sets the author to the logged in user', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token);
        expect(res.status).toBe(201);
        expect(res.body.author.username).toBe(validUser.username);
    });

    it('doesnt leak password hash in author', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token);
        expect(res.status).toBe(201);
        expect(res.body.author).not.toHaveProperty('passwordHash');
    });

    it('saves ingredients in order', async () => {
        const token = await loginAndGetAccessToken();
        await createRecipe(token);

        const recipe = await prisma.recipe.findFirst({
            where: { title: validRecipe.title },
            select: { ingredients: { orderBy: { ingredientOrder: 'asc' } } },
        });

        expect(recipe).not.toBeNull();
        expect(recipe!.ingredients.map((i) => i.name)).toEqual(
            validRecipe.ingredients.map((i) => i.name)
        );
    });

    it('returns 400 when title is too short', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token, { title: 'ab' });
        expect(res.body.error).toBeDefined();
        expect(res.status).toBe(400);
    });

    it('returns 400 when title does not exist', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token, { title: undefined });
        expect(res.body.error).toBeDefined();
        expect(res.status).toBe(400);
    });

    it('returns 401 when the token is invalid', async () => {
        await loginAndGetAccessToken();
        const res = await createRecipe('garbagetoken');
        expect(res.status).toBe(401);
    });

    it('returns 401 when the token is missing', async () => {
        await loginAndGetAccessToken();
        const res = await request(app).post('/api/recipes').send(validRecipe);
        expect(res.status).toBe(401);
    });

    it('returns 400 when the ingredients are missing', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token, { ingredients: [] });
        expect(res.status).toBe(400);
    });

    it('ignores authorId in the request body and returns 201', async () => {
        const fakeUserId = 999;
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token, { authorId: fakeUserId });
        expect(res.status).toBe(201);
        expect(res.body.author.username).toBe(validUser.username);
    });

    it('returns 201 with only required fields', async () => {
        const token = await loginAndGetAccessToken();
        const res = await request(app)
            .post('/api/recipes')
            .send({ title: 'bread', ingredients: [{ name: 'flour' }] })
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(201);
    });
});
