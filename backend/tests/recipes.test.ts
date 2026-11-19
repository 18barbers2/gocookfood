import { describe, it, expect } from 'vitest';
import prisma from '../src/lib/prisma.js';
import {
    validUser,
    loginAndGetAccessToken,
    validRecipe,
    createRecipe,
    getRecipe,
} from './helpers.js';
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

    it('returns 400 when the ingredients are empty', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token, { ingredients: [] });
        expect(res.status).toBe(400);
    });

    it('returns 400 when the ingredients are missing', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token, { ingredients: undefined });
        expect(res.status).toBe(400);
    });

    it('returns 400 when the ingredients are not an array', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token, { ingredients: 'bacon' });
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

    it('returns 400 when recipe title is all whitespace', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token, { title: '      ' });
        expect(res.status).toBe(400);
    });

    it('returns 400 when recipe title is not a string', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token, { title: 123123 });
        expect(res.status).toBe(400);
    });

    it('returns 400 when ingredient has no name', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token, {
            ingredients: [
                {
                    quantity: '5',
                },
            ],
        });
        expect(res.status).toBe(400);
        expect(res.body.details[0].path).toEqual(['ingredients', 0, 'name']);
    });

    it("returns 400 when steps isn\'t an array", async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token, { steps: 'this is a step as a string' });
        expect(res.status).toBe(400);
    });
});

describe('GET /api/recipes/:id', () => {
    it('returns 200 with recipe', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token);
        const recipeId = res.body.id;

        const valid = await getRecipe(recipeId);

        expect(valid.status).toBe(200);
        expect(valid.body.title).toBe(validRecipe.title);
    });

    it('returns 404 when no recipe exists', async () => {
        const token = await loginAndGetAccessToken();
        await createRecipe(token);
        const invalid = await getRecipe(123123);

        expect(invalid.status).toBe(404);
    });

    it('returns 400 when no id invalid', async () => {
        const token = await loginAndGetAccessToken();
        await createRecipe(token);
        const invalid = await request(app).get('/api/recipes/invalidId');

        expect(invalid.status).toBe(400);
    });

    it('returns ingredients in order', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token);
        const recipe = await request(app).get(`/api/recipes/${res.body.id}`);

        expect(recipe.status).toBe(200);
        expect(recipe.body.ingredients.map((i: { name: string }) => i.name)).toEqual(
            validRecipe.ingredients.map((i) => i.name)
        );
    });

    it("doesn't leak password hash", async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token);
        const recipe = await request(app).get(`/api/recipes/${res.body.id}`);
        expect(recipe.body.author).not.toHaveProperty('passwordHash');
    });

    it('optional fields are null', async () => {
        const token = await loginAndGetAccessToken();
        const res = await createRecipe(token);
        const recipe = await request(app).get(`/api/recipes/${res.body.id}`);
        expect(recipe.body.ingredients[2].quantity).toBeNull();
        expect(recipe.body.ingredients[2].unit).toBeNull();
    });
});
