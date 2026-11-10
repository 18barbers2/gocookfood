import prisma from '../lib/prisma.js';
import { Router, type Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.post('/recipe/create', requireAuth, async (req, res) => {
    const title = req.body.recipeTitle;
    const description = req.body.description;
    const steps = req.body.steps;
    const ingredients = req.body.ingredients;

    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title || title.length < 3) {
        return res.status(403).json({ error: 'Title too short (must be > 3 characters)' });
    }

    if (!ingredients) {
        return res.status(403).json({ error: 'Must contain at least 1 ingredient' });
    }

    try {
        const created = await prisma.recipe.create({
            data: {
                title,
                description: description ?? null,
                authorId: req.user.id,
                steps: steps ?? null,
                ingredients: ingredients || null,
            },
            select: {
                title: true,
                author: true,
                createdAt: true,
            },
        });
    } catch (error) {}
});
