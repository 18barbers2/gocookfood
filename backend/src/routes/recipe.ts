import prisma from '../lib/prisma.js';
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.post('/create', requireAuth, async (req, res) => {
    const title = req.body.title;
    const description = req.body.description;
    const steps = req.body.steps;
    const ingredients = req.body.ingredients;

    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title || title.length < 3) {
        return res.status(400).json({ error: 'Title too short (must be > 3 characters)' });
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: 'Must contain at least 1 ingredient' });
    }

    try {
        const created = await prisma.recipe.create({
            data: {
                title,
                description: description ?? null,
                authorId: req.user.id,
                steps: steps ?? [],
                ingredients: {
                    create: ingredients.map(
                        (ing: { name: string; quantity?: string; unit?: string }, i: number) => ({
                            name: ing.name,
                            quantity: ing.quantity ?? null,
                            unit: ing.unit ?? null,
                            ingredientOrder: i,
                        })
                    ),
                },
            },
            select: {
                title: true,
                author: { select: { id: true, username: true } },
                createdAt: true,
            },
        });

        return res.status(201).json(created);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
