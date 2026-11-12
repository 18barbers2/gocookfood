import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import prisma from '../src/lib/prisma.js';
import { loginAndGetAccessToken } from './auth.test.js';
import { validUser } from './auth.test.js';

const validRecipe = {
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

describe('POST /api/recipes', () => {
    it('returns 201 when recipe is created', async () => {
        const token = await loginAndGetAccessToken();
        const res = await request(app)
            .post('/api/recipes')
            .send(validRecipe)
            .set('Authorization', `Bearer ${token}`);
        console.log(JSON.stringify(res.body, null, 2));
        expect(res.status).toBe(201);
        expect((await prisma.ingredient.count()) === 4);
    });

    it('sets the author to the logged in user', async () => {
        const token = await loginAndGetAccessToken();
        const res = await request(app)
            .post('/api/recipes')
            .send(validRecipe)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(201);
        expect(res.body.author.username).toBe(validUser.username);
    });

    it('doesnt leak password hash in author', async () => {
        const token = await loginAndGetAccessToken();
        const res = await request(app)
            .post('/api/recipes')
            .send(validRecipe)
            .set('Authorization', `Bearer ${token}`);

        expect(res.body.author.passwordHash).toBeUndefined();
    });

    it('saves ingredients in order', async () => {
        const token = await loginAndGetAccessToken();
        const res = await request(app)
            .post('/api/recipes')
            .send(validRecipe)
            .set('Authorization', `Bearer ${token}`);

        const recipe = await prisma.recipe.findFirst({
            where: { title: validRecipe.title },
            select: { ingredients: { orderBy: { ingredientOrder: 'asc' } } },
        });

        expect(recipe).not.toBeNull();
        expect(recipe!.ingredients.map((i) => i.name)).toEqual(
            validRecipe.ingredients.map((i) => i.name)
        );
    });
});
