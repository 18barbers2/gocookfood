import prisma from '../lib/prisma.js';
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { z } from 'zod';

const router = Router();

const createRecipeSchema = z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(1).max(500).optional(),
    imageUrl: z.url().trim().optional(),
    steps: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
    ingredients: z
        .array(
            z.object({
                name: z.string().trim().min(1),
                quantity: z.string().trim().nullish(),
                unit: z.string().trim().nullish(),
            })
        )
        .min(1),
});

router.post('/', requireAuth, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = createRecipeSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid recipe', details: parsed.error.issues });
    }

    const { title, description, imageUrl, steps, ingredients } = parsed.data;

    try {
        const created = await prisma.recipe.create({
            data: {
                title,
                description: description ?? null,
                imageUrl: imageUrl ?? null,
                authorId: req.user.id,
                steps: steps,
                ingredients: {
                    create: ingredients.map((ing, i) => ({
                        name: ing.name,
                        quantity: ing.quantity ?? null,
                        unit: ing.unit ?? null,
                        ingredientOrder: i,
                    })),
                },
            },
            select: {
                id: true,
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
